"""Conversation and Message read endpoints — /api/v1/conversations."""

from __future__ import annotations

import uuid
import typing as t

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_session
from app.modules.conversations.models import Conversation, Message
from app.modules.conversations.schemas import ConversationResponse, MessageResponse

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=list[ConversationResponse])
async def list_conversations(
    tenant_id: uuid.UUID | None = None,
    status: str | None = None,
    limit: int = Query(default=50, le=200),
    session: AsyncSession = Depends(get_session),
) -> t.Any:
    """List conversations, optionally filtered by tenant and/or status."""
    query = (
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .order_by(Conversation.last_message_at.desc().nullslast())
        .limit(limit)
    )
    if tenant_id:
        query = query.where(Conversation.tenant_id == tenant_id)
    if status:
        query = query.where(Conversation.status == status)

    result = await session.execute(query)
    convos = result.scalars().all()

    # Build response with message count and derived platform
    responses = []
    for c in convos:
        resp = ConversationResponse(
            **{k: v for k, v in c.__dict__.items() if k != "_sa_instance_state"},
            platform=c.platform,
            message_count=len(c.messages),
        )
        responses.append(resp)
    return responses


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> t.Any:
    """Get a single conversation with message count."""
    conversation = await session.get(Conversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return ConversationResponse(
        **{k: v for k, v in conversation.__dict__.items() if k != "_sa_instance_state"},
        platform=conversation.platform,
        message_count=0,
    )


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
async def list_messages(
    conversation_id: uuid.UUID,
    limit: int = Query(default=100, le=500),
    session: AsyncSession = Depends(get_session),
) -> t.Any:
    """List messages for a conversation, newest first."""
    result = await session.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    messages = result.scalars().all()
    # Return in chronological order
    messages.reverse()
    return messages
