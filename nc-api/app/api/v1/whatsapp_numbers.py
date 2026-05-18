"""WhatsApp Number CRUD endpoints — /api/v1/whatsapp-numbers."""

from __future__ import annotations

import uuid
import typing as t

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.whatsapp.models import WhatsAppNumber
from app.modules.whatsapp.schemas import (
    WhatsAppNumberCreate,
    WhatsAppNumberResponse,
    WhatsAppNumberUpdate,
)

router = APIRouter(prefix="/whatsapp-numbers", tags=["whatsapp"])


@router.get("", response_model=list[WhatsAppNumberResponse])
async def list_numbers(
    tenant_id: uuid.UUID | None = None,
    session: AsyncSession = Depends(get_session),
) -> t.Any:
    """List all WhatsApp numbers, optionally filtered by tenant_id."""
    query = select(WhatsAppNumber).order_by(WhatsAppNumber.created_at.desc())
    if tenant_id:
        query = query.where(WhatsAppNumber.tenant_id == tenant_id)
    result = await session.execute(query)
    return result.scalars().all()


@router.post("", response_model=WhatsAppNumberResponse, status_code=201)
async def create_number(
    body: WhatsAppNumberCreate,
    session: AsyncSession = Depends(get_session),
) -> t.Any:
    """Register a new WhatsApp number for a tenant."""
    # Check phone_number_id uniqueness
    existing = await session.execute(
        select(WhatsAppNumber).where(
            WhatsAppNumber.phone_number_id == body.phone_number_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409, detail="phone_number_id already registered"
        )

    number = WhatsAppNumber(**body.model_dump())
    session.add(number)
    await session.commit()
    await session.refresh(number)
    return number


@router.get("/{number_id}", response_model=WhatsAppNumberResponse)
async def get_number(
    number_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> t.Any:
    """Get a single WhatsApp number."""
    number = await session.get(WhatsAppNumber, number_id)
    if not number:
        raise HTTPException(status_code=404, detail="WhatsApp number not found")
    return number


@router.patch("/{number_id}", response_model=WhatsAppNumberResponse)
async def update_number(
    number_id: uuid.UUID,
    body: WhatsAppNumberUpdate,
    session: AsyncSession = Depends(get_session),
) -> t.Any:
    """Update a WhatsApp number."""
    number = await session.get(WhatsAppNumber, number_id)
    if not number:
        raise HTTPException(status_code=404, detail="WhatsApp number not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(number, field, value)

    await session.commit()
    await session.refresh(number)
    return number


@router.delete("/{number_id}", status_code=204)
async def delete_number(
    number_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Remove a WhatsApp number."""
    number = await session.get(WhatsAppNumber, number_id)
    if not number:
        raise HTTPException(status_code=404, detail="WhatsApp number not found")

    await session.delete(number)
    await session.commit()
