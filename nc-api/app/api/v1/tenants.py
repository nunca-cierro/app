"""Tenant CRUD endpoints — /api/v1/tenants."""

from __future__ import annotations

import uuid
import typing as t

from fastapi import APIRouter, Depends, HTTPException, Response
from loguru import logger
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.core.config import settings
from app.modules.auth.deps import RoleChecker, get_current_user
from app.modules.auth.models import User, UserRole
from app.modules.auth.user_tenant import UserTenant
from app.modules.tenants.internal import is_internal_tenant
from app.modules.tenants.models import Tenant

admin_or_super = RoleChecker(allowed_roles=[UserRole.ADMIN, UserRole.SUPERADMIN])
from app.modules.tenants.schemas import (
    ActivatePlanRequest,
    PaymentStatusRequest,
    TenantCreate,
    TenantUpdate,
    TenantResponse,
)
from app.modules.tenants.service import activate_tenant_plan, update_payment_status

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.post("", response_model=TenantResponse, status_code=201)
async def create_new_tenant(
    body: TenantCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Tenant:
    """Register a new tenant (business).

    Superadmin can create tenants directly.
    Tenantless users (no existing UserTenant) can create their first tenant,
    which auto-assigns them as admin with is_primary=True.
    Admin users cannot create new tenants — only edit existing ones.
    """
    role = getattr(current_user, "current_role", current_user.role)
    is_tenantless = not getattr(current_user, "current_tenant_id", None)

    # Check if user can create a tenant
    if role != UserRole.SUPERADMIN and not is_tenantless:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        data = body.model_dump()
        if role != UserRole.SUPERADMIN:
            # Self-service onboarding: tenants always start on the basic plan
            # (active status is the model default). A tenant admin/client must
            # never self-assign a higher plan or a custom status.
            data["plan"] = "basic"
        tenant = Tenant(**data)
        session.add(tenant)
        await session.flush()

        # If tenantless, auto-assign as admin
        if is_tenantless:
            # Verify user has no existing tenant
            existing = await session.execute(
                select(UserTenant).where(UserTenant.user_id == current_user.id)
            )
            if existing.first():
                # User already has a tenant — requires superadmin
                if role != UserRole.SUPERADMIN:
                    await session.delete(tenant)
                    await session.commit()
                    raise HTTPException(status_code=403, detail="Forbidden")

            ut = UserTenant(
                user_id=current_user.id,
                tenant_id=tenant.id,
                role=UserRole.ADMIN,
                is_primary=True,
            )
            session.add(ut)
            current_user.role = UserRole.ADMIN

        await session.commit()
        await session.refresh(tenant)
        return tenant
    except IntegrityError as e:
        await session.rollback()
        logger.error(f"IntegrityError creating tenant: {e}")
        raise HTTPException(
            status_code=409,
            detail="Ya existe un negocio con ese nombre o slug.",
        )


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
    tenants = result.scalars().all()
    # Internal tenant is exempt from payment (configurable via settings)
    for t in tenants:
        if is_internal_tenant(t.slug, settings.internal_tenant_slug):
            t.payment_status = "active"
    return tenants


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
    if is_internal_tenant(tenant.slug, settings.internal_tenant_slug):
        tenant.payment_status = "active"
    return tenant


@router.patch("/{tenant_id}", response_model=TenantResponse)
async def update_tenant_info(
    tenant_id: uuid.UUID,
    body: TenantUpdate,
    current_user: User = Depends(admin_or_super),
    session: AsyncSession = Depends(get_session),
) -> Tenant:
    """Update tenant information."""
    # Isolation: non-superadmin users can only update their ACTIVE tenant
    # (mirrors agents/platform-connections) — prevents cross-tenant mutation
    # by UUID guessing.
    role = getattr(current_user, "current_role", current_user.role)
    if role != UserRole.SUPERADMIN:
        active_tid = getattr(current_user, "current_tenant_id", None)
        if active_tid is None or active_tid != tenant_id:
            raise HTTPException(status_code=403, detail="Forbidden")

    tenant = await session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    update_data = body.model_dump(exclude_unset=True)
    # plan/status are restricted to superadmin or the authorized activation
    # flow (PATCH /tenants/{id}/activate-plan). Non-superadmin admins can
    # never change them — silently dropped so the edit form keeps working
    # without privilege creep (self-upgrade to enterprise / status tampering).
    if role != UserRole.SUPERADMIN:
        update_data.pop("plan", None)
        update_data.pop("status", None)

    for key, value in update_data.items():
        setattr(tenant, key, value)

    session.add(tenant)
    await session.commit()
    await session.refresh(tenant)
    return tenant


superadmin_check = RoleChecker(allowed_roles=[UserRole.SUPERADMIN])


@router.patch("/{tenant_id}/activate-plan", response_model=TenantResponse)
async def activate_tenant_plan_endpoint(
    tenant_id: uuid.UUID,
    body: ActivatePlanRequest,
    current_user: User = Depends(superadmin_check),
    session: AsyncSession = Depends(get_session),
) -> Tenant:
    """Activate a tenant's plan (superadmin only).

    Sets ``payment_status`` to ``active`` and records the activation
    timestamp (immutable after first activation).
    """
    return await activate_tenant_plan(
        tenant_id=tenant_id,
        plan=body.plan,
        session=session,
    )


@router.patch("/{tenant_id}/payment-status", response_model=TenantResponse)
async def toggle_payment_status_endpoint(
    tenant_id: uuid.UUID,
    body: PaymentStatusRequest,
    current_user: User = Depends(superadmin_check),
    session: AsyncSession = Depends(get_session),
) -> Tenant:
    """Toggle a tenant's payment status (superadmin only).

    On ``active``: sets ``plan_activated_at`` to current UTC timestamp.
    On ``inactive``: clears ``plan_activated_at``.
    """
    return await update_payment_status(
        tenant_id=tenant_id,
        payment_status=body.payment_status,
        session=session,
    )


@router.delete("/{tenant_id}", status_code=204, response_model=None)
async def delete_tenant(
    tenant_id: uuid.UUID,
    current_user: User = Depends(superadmin_check),
    session: AsyncSession = Depends(get_session),
):
    """Delete a tenant (superadmin only)."""
    tenant = await session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    await session.delete(tenant)
    await session.commit()
