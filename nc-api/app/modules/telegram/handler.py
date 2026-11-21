"""Telegram message handler — channel adapter and ingress routing.

Delegates message processing to the agnostic EngineService while preserving
backward compatibility for telegram webhook handling.
"""

from __future__ import annotations

import typing as t
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.rate_limiter import rate_limiter
from app.modules.conversations.models import Conversation, Message
from app.modules.engine.schemas import InboundMessage
from app.modules.engine.service import engine_service
from app.modules.integrations.llm.provider import llm_client
from app.modules.platform_connections.models import PlatformConnection
from app.modules.telegram.adapter import TelegramAdapter
from app.modules.telegram.webhook import extract_telegram_message

TelegramUpdateT = dict[str, t.Any]

__all__ = [
    "TelegramAdapter",
    "TelegramUpdateT",
    "handle_telegram_incoming",
    "llm_client",
    "rate_limiter",
]


async def handle_telegram_incoming(
    update: TelegramUpdateT,
    connection: PlatformConnection | None,
    session: AsyncSession,
) -> None:
    """Process a raw Telegram update from the webhook via EngineService."""
    parsed = extract_telegram_message(update)
    if parsed is None:
        logger.info("No text message to process in Telegram update")
        return

    if connection is None:
        logger.warning("No connection provided for Telegram update — skipping")
        return

    inbound = InboundMessage(
        platform_connection_id=connection.id,
        platform="telegram",
        external_user_id=parsed["external_user_id"],
        external_message_id=parsed["external_message_id"],
        content=parsed["content"],
        from_me=False,
        remote_jid=parsed["external_user_id"],
        raw_payload=update,
    )

    import sys
    tg_mod = sys.modules.get(__name__)
    adapter_cls = getattr(tg_mod, "TelegramAdapter", TelegramAdapter) if tg_mod else TelegramAdapter
    active_llm = getattr(tg_mod, "llm_client", llm_client) if tg_mod else llm_client

    adapter = adapter_cls()
    await engine_service.process_inbound(
        inbound=inbound,
        connection=connection,
        session=session,
        adapter=adapter,
        llm=active_llm,
    )
