"""Redis-based message debounce — aggregates rapid-fire messages.

When a user sends 3-5 short messages in quick succession (e.g. "Hola" +
"quiero" + "una cita"), we wait a short window (configurable, default 3s)
after the LAST message before processing. This prevents 3-5 separate LLM
calls and gives the bot a complete, coherent input.

Uses Redis sorted sets with timestamp scores for O(1) append + range queries.
"""

from __future__ import annotations

import json
import logging
import typing as t
from datetime import datetime, UTC

import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────────

# How long to wait (seconds) after the last message before processing.
DEBOUNCE_WINDOW_SECONDS: int = 3

# Redis key prefix for debounce buffers.
_DEBOUNCE_PREFIX: str = "debounce"

# Maximum age (seconds) for buffered messages — discard anything older.
_MAX_BUFFER_AGE: int = 30


# ── Redis client (lazy singleton) ────────────────────────────────────────────

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    """Get or create the async Redis client (singleton)."""
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(
            settings.cache_redis_url,
            decode_responses=True,
            socket_connect_timeout=5,
        )
    return _redis


async def close_redis() -> None:
    """Close the Redis client (call on shutdown)."""
    global _redis
    if _redis is not None:
        await _redis.close()
        _redis = None


# ── Buffer operations ────────────────────────────────────────────────────────


def _buffer_key(user_id: str, conn_id: str) -> str:
    """Redis key for a specific user+connection debounce buffer."""
    return f"{_DEBOUNCE_PREFIX}:{conn_id}:{user_id}"


async def push_message(
    user_id: str,
    conn_id: str,
    message: dict[str, t.Any],
) -> float:
    """Add a message to the user's debounce buffer.

    Returns the current buffer size (number of messages).
    """
    redis = await get_redis()
    key = _buffer_key(user_id, conn_id)

    now = datetime.now(UTC).timestamp()
    # Store message as JSON with timestamp as score
    await redis.zadd(key, {json.dumps(message, default=str): now})

    # Set TTL to prevent unbounded growth — buffer auto-expires
    await redis.expire(key, _MAX_BUFFER_AGE)

    size = await redis.zcard(key)
    logger.debug(
        "Debounce push | user={uid} | conn={cid} | size={s}",
        uid=user_id, cid=conn_id, s=size,
    )
    return size


async def flush_buffer(
    user_id: str,
    conn_id: str,
) -> list[dict[str, t.Any]]:
    """Retrieve and clear all buffered messages for a user.

    Returns messages in chronological order (oldest first).
    Returns empty list if buffer is empty or expired.
    """
    redis = await get_redis()
    key = _buffer_key(user_id, conn_id)

    # Get all messages ordered by timestamp (score)
    raw = await redis.zrange(key, 0, -1)
    if not raw:
        return []

    # Delete the buffer
    await redis.delete(key)

    # Parse and sort by score (timestamp)
    messages = []
    for item in raw:
        try:
            messages.append(json.loads(item))
        except (json.JSONDecodeError, TypeError):
            logger.warning("Failed to parse debounced message: %s", item)

    logger.info(
        "Debounce flush | user={uid} | conn={cid} | count={n}",
        uid=user_id, cid=conn_id, n=len(messages),
    )
    return messages


async def get_buffer_size(user_id: str, conn_id: str) -> int:
    """Check how many messages are currently buffered."""
    redis = await get_redis()
    key = _buffer_key(user_id, conn_id)
    return await redis.zcard(key)
