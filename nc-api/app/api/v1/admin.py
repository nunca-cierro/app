"""Admin endpoints — superadmin only."""

from __future__ import annotations

import typing as t

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from uuid import UUID

from fastapi import Response

from app.db.session import get_session
from app.modules.auth.deps import RoleChecker, get_current_user
from app.modules.auth.models import User, UserRole
from app.modules.auth.service import hash_password

admin_or_super = RoleChecker(allowed_roles=[UserRole.ADMIN, UserRole.SUPERADMIN])
from app.modules.auth.schemas import (
    AdminUserOut,
    AssignTenantRequest,
    CreateUserRequest,
    TenantAssociationOut,
)
from app.modules.auth.user_tenant import UserTenant
from app.modules.tenants.models import Tenant

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[AdminUserOut])
async def list_users(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> t.Any:
    """List all registered users with their tenant assignments. Superadmin only."""
    if getattr(current_user, "current_role", current_user.role) != UserRole.SUPERADMIN:
        raise HTTPException(status_code=403, detail="Only superadmins can list users")

    result = await session.execute(
        select(User)
        .options(selectinload(User.tenant_associations))
        .order_by(User.created_at.desc())
    )
    users = result.scalars().all()

    # Build enriched response — load tenant names for each association
    response: list[AdminUserOut] = []
    for user in users:
        tenants_out: list[TenantAssociationOut] = []
        if user.tenant_associations:
            tenant_ids = [ut.tenant_id for ut in user.tenant_associations]
            tenant_map = {}
            if tenant_ids:
                t_result = await session.execute(
                    select(Tenant).where(Tenant.id.in_(tenant_ids))
                )
                tenant_map = {t.id: t.name for t in t_result.scalars().all()}

            for ut in user.tenant_associations:
                tenants_out.append(
                    TenantAssociationOut(
                        tenant_id=ut.tenant_id,
                        tenant_name=tenant_map.get(ut.tenant_id, "Unknown"),
                        role=ut.role,
                        is_primary=ut.is_primary,
                    )
                )

        response.append(
            AdminUserOut(
                id=user.id,
                email=user.email,
                name=user.name,
                role=user.role,
                created_at=user.created_at,
                tenants=tenants_out,
            )
        )

    return response


@router.post("/users", response_model=AdminUserOut, status_code=201)
async def create_user(
    body: CreateUserRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> t.Any:
    """Create a new user. Superadmin only."""
    if getattr(current_user, "current_role", current_user.role) != UserRole.SUPERADMIN:
        raise HTTPException(status_code=403, detail="Only superadmins can create users")

    if len(body.password) < 6:
        raise HTTPException(
            status_code=422, detail="Password must be at least 6 characters"
        )

    # Check email uniqueness
    existing = await session.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    # Validate role
    valid_roles = {r.value for r in UserRole}
    if body.role not in valid_roles:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}",
        )

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        name=body.name,
        role=body.role,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    return AdminUserOut(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        created_at=user.created_at,
        tenants=[],
    )


@router.delete("/users/{user_id}", status_code=204, response_model=None)
async def delete_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Delete a user. Superadmin only. Cannot delete yourself."""
    if getattr(current_user, "current_role", current_user.role) != UserRole.SUPERADMIN:
        raise HTTPException(status_code=403, detail="Only superadmins can delete users")

    if user_id == current_user.id:
        raise HTTPException(status_code=403, detail="Cannot delete yourself")

    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent deleting the last superadmin
    if user.role == UserRole.SUPERADMIN:
        count_result = await session.execute(
            select(User).where(User.role == UserRole.SUPERADMIN)
        )
        superadmin_count = len(count_result.scalars().all())
        if superadmin_count <= 1:
            raise HTTPException(
                status_code=403,
                detail="Cannot delete the last superadmin",
            )

    await session.delete(user)
    await session.commit()


@router.post("/assign-tenant", status_code=200)
async def assign_tenant(
    body: AssignTenantRequest,
    current_user: User = Depends(admin_or_super),
    session: AsyncSession = Depends(get_session),
) -> t.Any:
    """Assign a user to a tenant with a specific role.

    Requires admin or superadmin role.
    """

    # Verify user exists
    user_result = await session.execute(select(User).where(User.id == body.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify tenant exists
    tenant_result = await session.execute(select(Tenant).where(Tenant.id == body.tenant_id))
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Create or update association
    assoc_result = await session.execute(
        select(UserTenant).where(
            UserTenant.user_id == body.user_id,
            UserTenant.tenant_id == body.tenant_id,
        )
    )
    user_tenant = assoc_result.scalar_one_or_none()

    if user_tenant:
        user_tenant.role = body.role
    else:
        # Check if user has any other tenant, if not make this primary
        primary_check = await session.execute(
            select(UserTenant).where(UserTenant.user_id == body.user_id)
        )
        has_tenants = primary_check.first() is not None
        
        user_tenant = UserTenant(
            user_id=body.user_id,
            tenant_id=body.tenant_id,
            role=body.role,
            is_primary=not has_tenants,
        )
        session.add(user_tenant)

    # Sync global user role — non-superadmin roles mirror their tenant role
    if user.role != UserRole.SUPERADMIN:
        user.role = body.role

    await session.commit()

    return {"status": "ok", "message": "User assigned to tenant successfully"}
