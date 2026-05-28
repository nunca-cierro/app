"""Tenant CRUD endpoints — /api/v1/tenants."""

from __future__ import annotations

import uuid
import typing as t

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.tenants.models import Tenant
from app.modules.tenants.schemas import TenantCreate, TenantUpdate, TenantResponse

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.post("", response_model=TenantResponse, status_code=201)
async def create_new_tenant(
    body: TenantCreate,
    session: AsyncSession = Depends(get_session),
) -> Tenant:
    """Register a new tenant (business)."""
    tenant = Tenant(**body.model_dump())
    session.add(tenant)
    await session.commit()
    await session.refresh(tenant)
    return tenant


@router.get("", response_model=t.List[TenantResponse])
async def list_tenants(
    session: AsyncSession = Depends(get_session),
    skip: int = 0,
    limit: int = 100,
) -> t.Sequence[Tenant]:
    """List all tenants."""
    from sqlalchemy import select
    result = await session.execute(select(Tenant).offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/{tenant_id}", response_model=TenantResponse)
async def get_tenant(
    tenant_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> Tenant:
    """Get a specific tenant."""
    tenant = await session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


@router.patch("/{tenant_id}", response_model=TenantResponse)
async def update_tenant_info(
    tenant_id: uuid.UUID,
    body: TenantUpdate,
    session: AsyncSession = Depends(get_session),
) -> Tenant:
    """Update tenant information."""
    tenant = await session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(tenant, key, value)

    session.add(tenant)
    await session.commit()
    await session.refresh(tenant)
    return tenant


@router.delete("/{tenant_id}", status_code=204, response_class=Response)
async def delete_tenant(
    tenant_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    """Delete a tenant."""
    tenant = await session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    await session.delete(tenant)
    await session.commit()
