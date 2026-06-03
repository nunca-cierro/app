"""WhatsApp Number CRUD endpoints — /api/v1/whatsapp-numbers."""

from __future__ import annotations

import uuid
import typing as t

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User, UserRole
from app.modules.whatsapp.models import WhatsAppNumber
from app.modules.whatsapp.schemas import WhatsAppNumberCreate, WhatsAppNumberUpdate, WhatsAppNumberResponse

router = APIRouter(prefix="/whatsapp-numbers", tags=["whatsapp-numbers"])


@router.post("", response_model=WhatsAppNumberResponse, status_code=201)
async def create_new_number(
    body: WhatsAppNumberCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> WhatsAppNumber:
    """Register a new WhatsApp number (Meta Cloud API)."""
    # Verify user belongs to the tenant
    role = getattr(current_user, "current_role", current_user.role)
    if role != UserRole.SUPERADMIN:
        if str(body.tenant_id) != str(getattr(current_user, "current_tenant_id", None)):
            raise HTTPException(status_code=403, detail="Forbidden")

    number = WhatsAppNumber(**body.model_dump())
    session.add(number)
    await session.commit()
    await session.refresh(number)
    return number


@router.get("", response_model=t.List[WhatsAppNumberResponse])
async def list_numbers(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    tenant_id: uuid.UUID | None = None,
    skip: int = 0,
    limit: int = 100,
) -> t.Sequence[WhatsAppNumber]:
    """List WhatsApp numbers."""
    from sqlalchemy import select
    query = select(WhatsAppNumber).offset(skip).limit(limit)
    
    role = getattr(current_user, "current_role", current_user.role)
    if role != UserRole.SUPERADMIN:
        tenant_id = getattr(current_user, "current_tenant_id", None)
        if not tenant_id:
            return []
        query = query.where(WhatsAppNumber.tenant_id == tenant_id)
    elif tenant_id:
        query = query.where(WhatsAppNumber.tenant_id == tenant_id)
    
    result = await session.execute(query)
    return result.scalars().all()


@router.get("/{number_id}", response_model=WhatsAppNumberResponse)
async def get_number(
    number_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> WhatsAppNumber:
    """Get a specific WhatsApp number."""
    number = await session.get(WhatsAppNumber, number_id)
    if not number:
        raise HTTPException(status_code=404, detail="WhatsApp number not found")
    
    role = getattr(current_user, "current_role", current_user.role)
    if role != UserRole.SUPERADMIN:
        if str(number.tenant_id) != str(getattr(current_user, "current_tenant_id", None)):
            raise HTTPException(status_code=403, detail="Forbidden")
            
    return number


@router.patch("/{number_id}", response_model=WhatsAppNumberResponse)
async def update_number_info(
    number_id: uuid.UUID,
    body: WhatsAppNumberUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> WhatsAppNumber:
    """Update WhatsApp number information."""
    number = await session.get(WhatsAppNumber, number_id)
    if not number:
        raise HTTPException(status_code=404, detail="WhatsApp number not found")

    role = getattr(current_user, "current_role", current_user.role)
    if role != UserRole.SUPERADMIN:
        if str(number.tenant_id) != str(getattr(current_user, "current_tenant_id", None)):
            raise HTTPException(status_code=403, detail="Forbidden")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(number, key, value)

    session.add(number)
    await session.commit()
    await session.refresh(number)
    return number


@router.delete("/{number_id}", status_code=204, response_class=Response)
async def delete_whatsapp_number(
    number_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Remove a WhatsApp number."""
    number = await session.get(WhatsAppNumber, number_id)
    if not number:
        raise HTTPException(status_code=404, detail="WhatsApp number not found")

    role = getattr(current_user, "current_role", current_user.role)
    if role != UserRole.SUPERADMIN:
        if str(number.tenant_id) != str(getattr(current_user, "current_tenant_id", None)):
            raise HTTPException(status_code=403, detail="Forbidden")

    await session.delete(number)
    await session.commit()
