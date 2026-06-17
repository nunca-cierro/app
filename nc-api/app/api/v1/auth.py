"""Auth endpoints — register, login, and switch tenant."""

from __future__ import annotations

import typing as t

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.auth.models import PaymentStatus, User, UserRole
from app.modules.auth.user_tenant import UserTenant
from app.modules.tenants.models import Tenant
from app.modules.auth.schemas import (
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    SwitchTenantRequest,
    TokenResponse,
    MeResponse,
    UserResponse,
)
from app.modules.auth.service import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.modules.auth.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(
    body: RegisterRequest,
    session: AsyncSession = Depends(get_session),
) -> t.Any:
    """Register a new user.

    Creates a bare user account. Tenant assignment is done separately
    via the admin panel (POST /admin/assign-tenant).
    """
    # Check email uniqueness
    existing = await session.execute(
        select(User).where(User.email == body.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    if len(body.password) < 6:
        raise HTTPException(
            status_code=422, detail="Password must be at least 6 characters"
        )

    # Validate role against allowed values
    ALLOWED_ROLES = {r.value for r in UserRole}
    if body.role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid role. Must be one of: {', '.join(sorted(ALLOWED_ROLES))}",
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

    token = create_access_token(
        str(user.id), user.email, role=user.role, tenant_id=None
    )

    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        email=user.email,
        name=user.name,
        role=user.role,
        tenant_id=None,
        tenant_plan=None,
        payment_status=None,
    )


@router.post("/switch-tenant", response_model=TokenResponse)
async def switch_tenant(
    body: SwitchTenantRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> t.Any:
    """Switch the current user's active tenant context.

    Validates the user has a UserTenant association with the target tenant,
    checks the tenant is active, then issues a new JWT scoped to that tenant.
    """
    # Verify UserTenant association
    assoc_result = await session.execute(
        select(UserTenant).where(
            UserTenant.user_id == current_user.id,
            UserTenant.tenant_id == body.tenant_id,
        )
    )
    ut = assoc_result.scalar_one_or_none()
    if not ut:
        raise HTTPException(
            status_code=403,
            detail="Not a member of this tenant",
        )

    # Verify tenant exists and is active
    tenant = await session.get(Tenant, body.tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=404,
            detail="Tenant not found",
        )
    if tenant.status != "active":
        raise HTTPException(
            status_code=403,
            detail="Tenant is not active",
        )

    token = create_access_token(
        str(current_user.id),
        current_user.email,
        role=ut.role,
        tenant_id=str(tenant.id),
    )

    return TokenResponse(
        access_token=token,
        user_id=str(current_user.id),
        email=current_user.email,
        name=current_user.name,
        role=ut.role,
        tenant_id=str(tenant.id),
        tenant_plan=tenant.plan,
        payment_status=PaymentStatus.ACTIVE if tenant.slug == "nuncacierro" else tenant.payment_status,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    session: AsyncSession = Depends(get_session),
) -> t.Any:
    """Login with email and password.

    Returns a JWT token valid for 7 days with role and tenant context.
    """
    result = await session.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    role = user.role
    tenant_id = None
    tenant_plan = None
    payment_status = None
    plan_activated_at = None

    if role != UserRole.SUPERADMIN:
        # Fetch primary tenant
        assoc_result = await session.execute(
            select(UserTenant).where(
                UserTenant.user_id == user.id, UserTenant.is_primary == True
            )
        )
        ut = assoc_result.scalar_one_or_none()
        if ut:
            role = ut.role
            tenant_id = str(ut.tenant_id)
            # Resolve tenant plan + payment info
            tenant = await session.get(Tenant, ut.tenant_id)
            if tenant:
                tenant_plan = tenant.plan
                payment_status = getattr(tenant, "payment_status", None)
                plan_activated_at = getattr(tenant, "plan_activated_at", None)
                # NuncaCierro is internal — exempt from payment
                if tenant.slug == "nuncacierro":
                    payment_status = PaymentStatus.ACTIVE

    token = create_access_token(
        str(user.id), user.email, role=role, tenant_id=tenant_id
    )

    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        email=user.email,
        name=user.name,
        role=role,
        tenant_id=tenant_id,
        tenant_plan=tenant_plan,
        payment_status=payment_status,
        plan_activated_at=plan_activated_at,
    )


@router.get("/me", response_model=MeResponse)
async def me(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> t.Any:
    """Get the currently logged-in user's profile with role, tenant context, and plan."""
    # Resolve current plan + payment info from tenant
    current_plan = None
    payment_status = None
    plan_activated_at = None
    current_tid = getattr(current_user, "current_tenant_id", None)
    if current_tid:
        tenant = await session.get(Tenant, current_tid)
        if tenant:
            current_plan = tenant.plan
            payment_status = getattr(tenant, "payment_status", None)
            plan_activated_at = getattr(tenant, "plan_activated_at", None)
            if tenant.slug == "nuncacierro":
                payment_status = PaymentStatus.ACTIVE

    response = MeResponse.model_validate(current_user)
    response.current_plan = current_plan
    response.payment_status = payment_status
    response.plan_activated_at = plan_activated_at
    return response


@router.post("/change-password", status_code=200)
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    """Change the current user's password.

    Requires the current password for verification.
    New password must be at least 6 characters.
    """
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="La contraseña actual no es correcta",
        )

    if len(body.new_password) < 6:
        raise HTTPException(
            status_code=422,
            detail="La nueva contraseña debe tener al menos 6 caracteres",
        )

    current_user.password_hash = hash_password(body.new_password)
    session.add(current_user)
    await session.commit()

    return {"status": "ok", "detail": "Contraseña actualizada correctamente"}
