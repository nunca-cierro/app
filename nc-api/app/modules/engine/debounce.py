"""Non-blocking Redis-based message debounce for incoming webhooks.

Enables POST /webhook endpoints to respond 200 OK immediately after validating
and enqueuing messages into a Redis sorted set buffer, rather than blocking the HTTP
connection for 3 seconds. A background worker task consolidates rapid-fire bursts
and delegates processing to the central EngineService.
"""

from __future__ import annotations

import asyncio
import json
import typing as t
import uuid as uuid_pkg
from collections import defaultdict
from datetime import UTC, datetime

from loguru import logger

from app.core.redis_client import get_redis
from app.modules.engine.schemas import ChannelAdapter, InboundMessage

DEBOUNCE_WINDOW_SECONDS: int = 3
_DEBOUNCE_PREFIX: str = "debounce"
_MAX_BUFFER_AGE: int = 30

# In-memory fallback buffers and locks when Redis is unreachable
_mem_buffers: dict[str, list[dict[str, t.Any]]] = defaultdict(list)
_mem_locks: set[str] = set()


def _buffer_key(user_id: str, conn_id: str) -> str:
    """Redis key for user+connection debounce buffer."""
    return f"{_DEBOUNCE_PREFIX}:{conn_id}:{user_id}"


def _lock_key(user_id: str, conn_id: str) -> str:
    """Redis key for debounce execution lock."""
    return f"debounce_lock:{conn_id}:{user_id}"


async def push_debounce_message(
    user_id: str,
    conn_id: str,
    message: dict[str, t.Any],
) -> float:
    """Add a message dict to the user's debounce sorted set buffer."""
    key = _buffer_key(user_id, conn_id)
    try:
        redis = await get_redis()
        now = datetime.now(UTC).timestamp()
        await redis.zadd(key, {json.dumps(message, default=str): now})
        await redis.expire(key, _MAX_BUFFER_AGE)
        return float(await redis.zcard(key))
    except Exception as exc:
        logger.debug("Redis unavailable for debounce push, using memory fallback: {e}", e=exc)
        _mem_buffers[key].append(message)
        return float(len(_mem_buffers[key]))


async def flush_debounce_buffer(
    user_id: str,
    conn_id: str,
) -> list[dict[str, t.Any]]:
    """Retrieve and atomically remove all buffered messages for a user in chronological order."""
    key = _buffer_key(user_id, conn_id)
    try:
        redis = await get_redis()
        raw = await redis.zrange(key, 0, -1)
        if not raw:
            return _mem_buffers.pop(key, [])

        await redis.delete(key)

        messages: list[dict[str, t.Any]] = []
        for item in raw:
            try:
                messages.append(json.loads(item))
            except (json.JSONDecodeError, TypeError):
                logger.warning("Failed to decode debounced message: %s", item)

        return messages
    except Exception as exc:
        logger.debug("Redis unavailable for debounce flush, using memory fallback: {e}", e=exc)
        return _mem_buffers.pop(key, [])


async def _run_debounced_worker(
    user_id: str,
    conn_id: str,
    platform: str,
    adapter: ChannelAdapter,
) -> None:
    """Background task: sleeps for debounce window, flushes buffer, merges messages, and processes."""
    try:
        from app.core.config import settings
        window = getattr(settings, "debounce_window_seconds", DEBOUNCE_WINDOW_SECONDS)
        if window > 0:
            await asyncio.sleep(window)
        messages = await flush_debounce_buffer(user_id, conn_id)

        try:
            redis = await get_redis()
            await redis.delete(_lock_key(user_id, conn_id))
        except Exception:
            _mem_locks.discard(_lock_key(user_id, conn_id))

        if not messages:
            return

        # Merge message contents in chronological order
        first_msg = messages[0]
        last_msg = messages[-1]

        if len(messages) > 1:
            merged_content = " ".join(
                str(m.get("content", "")) for m in messages if m.get("content")
            )
            logger.info(
                "Debounce merged {n} messages | user={u} | conn={c}",
                n=len(messages),
                u=user_id,
                c=conn_id,
            )
        else:
            merged_content = str(last_msg.get("content", ""))

        inbound = InboundMessage(
            platform_connection_id=conn_id,
            platform=platform,
            external_user_id=user_id,
            external_message_id=last_msg.get("external_message_id") or first_msg.get("external_message_id", ""),
            content=merged_content,
            from_me=last_msg.get("from_me", False),
            remote_jid=last_msg.get("remote_jid"),
            raw_payload=last_msg,
        )

        from app.db.session import async_session_factory, get_session
        from app.main import app
        from app.modules.platform_connections.service import get_connection

        override = app.dependency_overrides.get(get_session)
        if override:
            gen = override()
            session = await anext(gen)
            ctx = None
        else:
            ctx = async_session_factory()
            session = await ctx.__aenter__()

        try:
            try:
                conn_uuid = uuid_pkg.UUID(conn_id)
            except ValueError:
                logger.error("Invalid connection_id UUID in debounce worker: {cid}", cid=conn_id)
                return

            connection = await get_connection(session, conn_uuid)
            if connection is None:
                logger.warning("Connection {cid} not found during debounce processing", cid=conn_id)
                return

            from app.modules.engine.service import engine_service
            import sys

            if platform == "evolution":
                from app.modules.evolution.adapter import EvolutionAdapter
                evo_mod = sys.modules.get("app.modules.evolution.handler")
                adapter_cls = getattr(evo_mod, "EvolutionAdapter", EvolutionAdapter) if evo_mod else EvolutionAdapter
                active_llm = getattr(evo_mod, "llm_client", None) if evo_mod else None
                active_count_fn = getattr(evo_mod, "_count_ai_responses_this_month", None) if evo_mod else None
                await engine_service.process_inbound(
                    inbound=inbound,
                    connection=connection,
                    session=session,
                    adapter=adapter_cls(),
                    llm=active_llm,
                    count_ai_responses_fn=active_count_fn,
                )
            elif platform == "telegram":
                from app.modules.telegram.adapter import TelegramAdapter
                tg_mod = sys.modules.get("app.modules.telegram.handler")
                adapter_cls = getattr(tg_mod, "TelegramAdapter", TelegramAdapter) if tg_mod else TelegramAdapter
                active_llm = getattr(tg_mod, "llm_client", None) if tg_mod else None
                await engine_service.process_inbound(
                    inbound=inbound,
                    connection=connection,
                    session=session,
                    adapter=adapter_cls(),
                    llm=active_llm,
                )
            else:
                await engine_service.process_inbound(
                    inbound=inbound,
                    connection=connection,
                    session=session,
                    adapter=adapter,
                )
        finally:
            if ctx:
                await ctx.__aexit__(None, None, None)
    except Exception as exc:
        logger.exception("Error in debounce background worker for user {uid}: {e}", uid=user_id, e=exc)


async def schedule_debounced_processing(
    inbound: InboundMessage,
    adapter: ChannelAdapter,
    background_tasks: t.Any | None = None,
) -> bool:
    """Schedule inbound message processing via non-blocking debounce.

    If this is the first message in a burst, acquires a lock and schedules
    the worker to run after ``DEBOUNCE_WINDOW_SECONDS``. Subsequent messages
    only buffer their content into Redis and return immediately.

    Returns:
        True if this message acquired the lock and scheduled the worker,
        False if buffered behind an already scheduled worker.
    """
    user_id = str(inbound.external_user_id)
    conn_id = str(inbound.platform_connection_id)

    # 1. Push to Redis buffer
    await push_debounce_message(user_id, conn_id, inbound.to_dict())

    # 2. Try to acquire the debounce lock (NX = only if not exists, TTL = 10s)
    lock_key = _lock_key(user_id, conn_id)
    acquired = False
    try:
        redis = await get_redis()
        acquired = bool(await redis.set(lock_key, "1", nx=True, ex=DEBOUNCE_WINDOW_SECONDS + 7))
    except Exception as exc:
        logger.debug("Redis unavailable for debounce lock, using memory fallback: {e}", e=exc)
        if lock_key not in _mem_locks:
            _mem_locks.add(lock_key)
            acquired = True
        else:
            acquired = False

    if acquired:
        logger.debug(
            "Debounce scheduled | user={u} | conn={c} | window={w}s",
            u=user_id,
            c=conn_id,
            w=DEBOUNCE_WINDOW_SECONDS,
        )
        if background_tasks is not None and hasattr(background_tasks, "add_task"):
            background_tasks.add_task(
                _run_debounced_worker,
                user_id,
                conn_id,
                inbound.platform,
                adapter,
            )
        else:
            asyncio.create_task(
                _run_debounced_worker(
                    user_id,
                    conn_id,
                    inbound.platform,
                    adapter,
                )
            )
        return True

    logger.debug(
        "Debounce message buffered behind active worker | user={u} | conn={c}",
        u=user_id,
        c=conn_id,
    )
    return False
