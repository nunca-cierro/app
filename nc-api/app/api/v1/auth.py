"""Auth endpoints — register and login.

No roles. Just a single user managing the SaaS.
"""

from __future__ import annotations

import typing as t

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.auth.models import User, UserRole
from app.modules.auth.user_tenant import UserTenant
from app.modules.tenants.models import Tenant
from app.modules.auth.schemas import (
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
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
    """Register a new admin user.

    Returns a JWT token directly so the user is logged in after registering.
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

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        name=body.name,
        role=UserRole.CLIENT,
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
