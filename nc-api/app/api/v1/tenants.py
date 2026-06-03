"""Tenant CRUD endpoints — /api/v1/tenants."""

from __future__ import annotations

import uuid
import typing as t

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User, UserRole
from app.modules.auth.user_tenant import UserTenant
from app.modules.tenants.models import Tenant
from app.modules.tenants.schemas import TenantCreate, TenantUpdate, TenantResponse

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.post("", response_model=TenantResponse, status_code=201)
async def create_new_tenant(
    body: TenantCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Tenant:
    """Register a new tenant (business).
    
    Only SUPERADMIN can create tenants directly here for now, 
    or we might allow CLIENTs to create their own first tenant.
    """
    role = getattr(current_user, "current_role", current_user.role)
    if role != UserRole.SUPERADMIN:
        # For now, only superadmins can create tenants. 
        # In the future, a "billing" role or self-service flow might allow this.
        raise HTTPException(status_code=403, detail="Forbidden")

    tenant = Tenant(**body.model_dump())
    session.add(tenant)
    await session.commit()
    await session.refresh(tenant)
    return tenant


@router.get("", response_model=t.List[TenantResponse])
async def list_tenants(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    skip: int = 0,
    limit: int = 100,
) -> t.Sequence[Tenant]:
    """List all tenants the user has access to."""
    from sqlalchemy import select

    role = getattr(current_user, "current_role", current_user.role)
    
    if role == UserRole.SUPERADMIN:
        query = select(Tenant)
    else:
        query = select(Tenant).join(UserTenant).where(UserTenant.user_id == current_user.id)
    
    result = await session.execute(query.offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/{tenant_id}", response_model=TenantResponse)
async def get_tenant(
    tenant_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Tenant:
    """Get a specific tenant."""
    role = getattr(current_user, "current_role", current_user.role)
    
    if role != UserRole.SUPERADMIN:
        from sqlalchemy import select
        assoc = await session.execute(
            select(UserTenant).where(
                UserTenant.user_id == current_user.id,
                UserTenant.tenant_id == tenant_id
            )
        )
        if not assoc.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Forbidden")

    tenant = await session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


@router.patch("/{tenant_id}", response_model=TenantResponse)
async def update_tenant_info(
    tenant_id: uuid.UUID,
    body: TenantUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Tenant:
    """Update tenant information."""
    role = getattr(current_user, "current_role", current_user.role)
    
    if role != UserRole.SUPERADMIN:
        from sqlalchemy import select
        assoc_result = await session.execute(
            select(UserTenant).where(
                UserTenant.user_id == current_user.id,
                UserTenant.tenant_id == tenant_id
            )
        )
        assoc = assoc_result.scalar_one_or_none()
        if not assoc or assoc.role != UserRole.ADMIN:
            # Only tenant admin or superadmin can update tenant info
            raise HTTPException(status_code=403, detail="Forbidden")

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
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Delete a tenant."""
    role = getattr(current_user, "current_role", current_user.role)
    
    if role != UserRole.SUPERADMIN:
        # Only superadmin can delete tenants
        raise HTTPException(status_code=403, detail="Forbidden")

    tenant = await session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    await session.delete(tenant)
    await session.commit()
