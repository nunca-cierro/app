"""Evolution API message handler — channel adapter and ingress routing.

Delegates core message processing to the agnostic EngineService while preserving
channel-specific connection update handlers, SSE notifications, and backward-compatible
helper signatures.
"""

from __future__ import annotations

import typing as t
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.rate_limiter import rate_limiter
from app.modules.conversations.models import Conversation, Message
from app.modules.engine.schemas import InboundMessage
from app.modules.engine.service import (
    ADMIN_CHAT_COOLDOWNS_KEY,
    ADMIN_COOLDOWN_HOURS,
    PAYMENT_KEYWORDS,
    _count_ai_responses_this_month,
    _faq_answer_for,
    _fold_accents,
    _has_payment_keyword,
    _insert_message_dedup,
    _matches_escalation_keyword,
    _normalize_jid,
    _significant_words,
    engine_service,
)
from app.modules.evolution.adapter import EvolutionAdapter
from app.modules.evolution.anti_spam import _resolve_anti_spam_config, spam_detector
from app.modules.evolution.webhook import (
    extract_evolution_connection_update,
    extract_evolution_message,
)
from app.modules.integrations.llm.provider import llm_client
from app.modules.platform_connections.models import PlatformConnection
from app.modules.platform_connections.sse import (
    EVENT_CONNECTION_STATE_CHANGED,
    notify_subscribers,
)

EvolutionEventT = dict[str, t.Any]

# Re-export constants for backward compatibility
__all__ = [
    "ADMIN_CHAT_COOLDOWNS_KEY",
    "ADMIN_COOLDOWN_HOURS",
    "EvolutionAdapter",
    "EvolutionEventT",
    "PAYMENT_KEYWORDS",
    "_count_ai_responses_this_month",
    "_faq_answer_for",
    "_fold_accents",
    "_has_payment_keyword",
    "_insert_message_dedup",
    "_matches_escalation_keyword",
    "_normalize_jid",
    "_significant_words",
    "handle_evolution_connection_update",
    "handle_evolution_incoming",
    "llm_client",
    "rate_limiter",
    "spam_detector",
]


async def handle_evolution_connection_update(
    event: EvolutionEventT,
    connection: PlatformConnection | None,
    session: AsyncSession,
) -> None:
    """Process a ``connection.update`` event from Evolution API.

    When the user scans the QR and WhatsApp connects, Evolution sends
    a ``connection.update`` with ``state: "open"``. We update the
    connection's ``extra_data.connection_status`` so the dashboard
    can reflect the new state without polling Evolution directly.
    """
    parsed = extract_evolution_connection_update(event)
    if parsed is None:
        return

    if connection is None:
        logger.warning("Connection update event but no connection found")
        return

    state = parsed["connection_state"]

    status_map = {
        "open": "connected",
        "connecting": "connecting",
        "close": "disconnected",
    }
    mapped = status_map.get(state, state)

    extra = dict(connection.extra_data or {})
    extra["connection_status"] = mapped
    connection.extra_data = extra

    if mapped == "connected":
        connection.status = "active"

    session.add(connection)
    await session.commit()

    await notify_subscribers(
        str(connection.id),
        EVENT_CONNECTION_STATE_CHANGED,
        {
            "connection_id": str(connection.id),
            "state": state,
            "status": mapped,
        },
    )

    logger.info(
        "Evolution connection {id} | state={state} → status={status}",
        id=connection.id,
        state=state,
        status=mapped,
    )


async def handle_evolution_incoming(
    event: EvolutionEventT,
    connection: PlatformConnection | None,
    session: AsyncSession,
) -> None:
    """Process a raw Evolution API webhook event via EngineService."""
    # ── 0. Route connection.update events ───────────────────────────────
    if event.get("event") == "connection.update":
        await handle_evolution_connection_update(event, connection, session)
        return

    # ── 1. Extract message ──────────────────────────────────────────────
    parsed = extract_evolution_message(event)
    if parsed is None:
        logger.info("No text message to process in Evolution event")
        return

    if connection is None:
        logger.warning("No connection provided for Evolution event — skipping")
        return

    inbound = InboundMessage(
        platform_connection_id=connection.id,
        platform="evolution",
        external_user_id=parsed["external_user_id"],
        external_message_id=parsed["external_message_id"],
        content=parsed["content"],
        from_me=parsed.get("from_me", False),
        remote_jid=parsed.get("remote_jid"),
        raw_payload=event,
    )

    import sys
    evo_mod = sys.modules.get(__name__)
    adapter_cls = getattr(evo_mod, "EvolutionAdapter", EvolutionAdapter) if evo_mod else EvolutionAdapter
    active_llm = getattr(evo_mod, "llm_client", llm_client) if evo_mod else llm_client
    active_count_fn = getattr(evo_mod, "_count_ai_responses_this_month", None) if evo_mod else None

    adapter = adapter_cls()
    await engine_service.process_inbound(
        inbound=inbound,
        connection=connection,
        session=session,
        adapter=adapter,
        llm=active_llm,
        count_ai_responses_fn=active_count_fn,
    )
