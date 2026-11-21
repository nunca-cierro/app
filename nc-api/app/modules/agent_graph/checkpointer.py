"""Checkpointer and conversation state persistence for LangGraph."""

from __future__ import annotations

import typing as t
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from langgraph.checkpoint.memory import MemorySaver

from app.modules.conversations.models import Conversation

_memory_checkpointer: MemorySaver | None = None


def get_default_checkpointer() -> MemorySaver:
    """Return the shared in-memory checkpointer for LangGraph execution."""
    global _memory_checkpointer
    if _memory_checkpointer is None:
        _memory_checkpointer = MemorySaver()
    return _memory_checkpointer


async def persist_conversation_checkpoint(
    session: AsyncSession,
    conversation_id: t.Any,
    state_data: dict[str, t.Any],
) -> None:
    """Persist conversation state summary into PostgreSQL conversation extra_data."""
    try:
        conv = await session.get(Conversation, conversation_id)
        if conv:
            extra = dict(conv.extra_data or {})
            extra["last_agent_intent"] = state_data.get("intent")
            extra["is_escalated"] = state_data.get("is_handoff_requested", False)
            if state_data.get("summary"):
                extra["conversation_summary"] = state_data.get("summary")
            conv.extra_data = extra
            session.add(conv)
            logger.debug("Persisted agent checkpoint to conversation | id={cid}", cid=conversation_id)
    except Exception as exc:
        logger.warning("Failed to persist conversation checkpoint: {e}", e=exc)
