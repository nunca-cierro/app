"""Conversation and Message read endpoints — /api/v1/conversations."""

from __future__ import annotations

import uuid
import typing as t

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_session
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User, UserRole
from app.modules.conversations.models import Conversation, Message
from app.modules.conversations.schemas import ConversationResponse, MessageResponse

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=list[ConversationResponse])
async def list_conversations(
    status: str | None = None,
    limit: int = Query(default=50, le=200),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> t.Any:
    """List conversations for the current tenant."""
    query = (
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .order_by(Conversation.last_message_at.desc().nullslast())
        .limit(limit)
    )
    
    # Isolation: Apply tenant filter
    if current_user.current_role != UserRole.SUPERADMIN:
        if not current_user.current_tenant_id:
            # User not assigned to a tenant yet — return empty list
            return []
        query = query.where(Conversation.tenant_id == current_user.current_tenant_id)
        
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
    current_user: User = Depends(get_current_user),
) -> t.Any:
    """Get a single conversation, enforced by tenant isolation."""
    query = select(Conversation).where(Conversation.id == conversation_id)
    
    # Isolation
    if current_user.current_role != UserRole.SUPERADMIN:
        if not current_user.current_tenant_id:
            raise HTTPException(status_code=403, detail="No tenant context")
        query = query.where(Conversation.tenant_id == current_user.current_tenant_id)
    
    result = await session.execute(query)
    conversation = result.scalar_one_or_none()
    
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
    current_user: User = Depends(get_current_user),
) -> t.Any:
    """List messages for a conversation, enforced by tenant isolation."""
    # First verify conversation access
    convo_query = select(Conversation).where(Conversation.id == conversation_id)
    if current_user.current_role != UserRole.SUPERADMIN:
        if not current_user.current_tenant_id:
            raise HTTPException(status_code=403, detail="No tenant context")
        convo_query = convo_query.where(Conversation.tenant_id == current_user.current_tenant_id)
    
    convo_result = await session.execute(convo_query)
    if not convo_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Conversation not found")

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
