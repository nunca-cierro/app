"""AutoReply CRUD endpoints — /api/v1/tenants/{tenant_id}/auto-replies."""
from __future__ import annotations
import uuid
import typing as t
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select, delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User, UserRole
from app.modules.auto_reply.models import AutoReply
from app.modules.auto_reply.schemas import AutoReplyCreate, AutoReplyUpdate, AutoReplyResponse
from app.modules.tenants.models import Tenant

router = APIRouter(prefix="/tenants/{tenant_id}/auto-replies", tags=["auto-replies"])


@router.get("", response_model=t.List[AutoReplyResponse])
async def list_auto_replies(
    tenant_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> t.Sequence[AutoReply]:
    result = await session.execute(
        select(AutoReply)
        .where(AutoReply.tenant_id == tenant_id)
        .order_by(AutoReply.priority.desc())
    )
    return result.scalars().all()


@router.post("", response_model=AutoReplyResponse, status_code=201)
async def create_auto_reply(
    tenant_id: uuid.UUID,
    body: AutoReplyCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> AutoReply:
    tenant = await session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    reply = AutoReply(**body.model_dump())
    session.add(reply)
    await session.commit()
    await session.refresh(reply)
    return reply


@router.put("/{reply_id}", response_model=AutoReplyResponse)
async def update_auto_reply(
    reply_id: uuid.UUID,
    body: AutoReplyUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> AutoReply:
    result = await session.execute(select(AutoReply).where(AutoReply.id == reply_id))
    reply = result.scalar_one_or_none()
    if not reply:
        raise HTTPException(status_code=404, detail="AutoReply not found")
    update_data = body.model_dump(exclude_unset=True)
    update_data.pop("tenant_id", None)
    for key, value in update_data.items():
        setattr(reply, key, value)
    session.add(reply)
    await session.commit()
    await session.refresh(reply)
    return reply


@router.delete("/{reply_id}", status_code=204, response_class=Response)
async def delete_auto_reply(
    reply_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(select(AutoReply).where(AutoReply.id == reply_id))
    reply = result.scalar_one_or_none()
    if not reply:
        raise HTTPException(status_code=404, detail="AutoReply not found")
    await session.delete(reply)
    await session.commit()


@router.post("/{reply_id}/toggle", response_model=AutoReplyResponse)
async def toggle_auto_reply(
    reply_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> AutoReply:
    result = await session.execute(select(AutoReply).where(AutoReply.id == reply_id))
    reply = result.scalar_one_or_none()
    if not reply:
        raise HTTPException(status_code=404, detail="AutoReply not found")
    reply.enabled = not reply.enabled
    session.add(reply)
    await session.commit()
    await session.refresh(reply)
    return reply
