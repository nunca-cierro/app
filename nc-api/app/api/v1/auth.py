"""Auth endpoints — register, login, switch tenant, and logout."""

from __future__ import annotations

import secrets
import typing as t

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.core.config import settings
from app.modules.auth.models import PaymentStatus, User, UserRole
from app.modules.auth.user_tenant import UserTenant
from app.modules.tenants.models import Tenant
from app.modules.auth.schemas import (
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    SwitchTenantRequest,
    MeResponse,
    UserResponse,
)
from app.modules.auth.service import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.modules.auth.deps import get_current_user
from app.modules.auth.csrf import ACCESS_TOKEN_COOKIE, CSRF_COOKIE
from app.modules.plans.capabilities import effective_capabilities
from app.modules.tenants.internal import is_internal_tenant

router = APIRouter(prefix="/auth", tags=["auth"])

SESSION_MAX_AGE = 7 * 24 * 60 * 60  # 7d — aligned with the JWT exp


def _set_auth_cookies(
    response: Response, access_token: str, csrf_token: str | None = None
) -> None:
    """Set the httpOnly session cookie + (optionally) the CSRF double-submit
    cookie (Slice B, spec AS-1/AS-2).

    ``nc_access_token`` is httpOnly (invisible to JS); ``nc_csrf`` is NOT
    httpOnly so the browser can echo it back in the ``X-CSRF-Token`` header.
    Both are SameSite=Lax, host-only, path=/, 7d max-age, and carry the
    ``Secure`` flag unless the dev .env sets AUTH_COOKIE_SECURE=false.
    """
    secure = settings.auth_cookie_secure
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE,
        value=access_token,
        max_age=SESSION_MAX_AGE,
        path="/",
        secure=secure,
        httponly=True,
        samesite="lax",
    )
    if csrf_token is not None:
        response.set_cookie(
            key=CSRF_COOKIE,
            value=csrf_token,
            max_age=SESSION_MAX_AGE,
            path="/",
            secure=secure,
            httponly=False,
            samesite="lax",
        )


def _clear_auth_cookies(response: Response) -> None:
    """Expire both session cookies (AS-8)."""
    secure = settings.auth_cookie_secure
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE,
        value="",
        max_age=0,
        path="/",
        secure=secure,
        httponly=True,
        samesite="lax",
    )
    response.set_cookie(
        key=CSRF_COOKIE,
        value="",
        max_age=0,
        path="/",
        secure=secure,
        httponly=False,
        samesite="lax",
    )


def _token_response(
    *,
    user_id: str,
    email: str,
    name: str,
    role: str,
    tenant_id: str | None,
    tenant_plan: str | None = None,
    payment_status: str | None = None,
    plan_activated_at: t.Any = None,
    capabilities: list[str],
) -> dict[str, t.Any]:
    """TokenResponse-shaped body WITHOUT the access_token.

    Slice B (spec AS-1): the JWT travels in the httpOnly session cookie, so
    the JSON body carries the context fields only — same shape as the old
    TokenResponse minus ``access_token``.
    """
    return {
        "token_type": "bearer",
        "user_id": user_id,
        "email": email,
        "name": name,
        "role": role,
        "tenant_id": tenant_id,
        "tenant_plan": tenant_plan,
        "payment_status": payment_status,
        "plan_activated_at": plan_activated_at,
        "capabilities": capabilities,
    }


@router.post("/register", status_code=201)
async def register(
    body: RegisterRequest,
    session: AsyncSession = Depends(get_session),
    response: Response = None,
) -> t.Any:
    """Register a new user.

    Creates a bare user account. Tenant assignment is done separately
    via the admin panel (POST /admin/assign-tenant). Sets the session
    cookie pair like login (AS-2); the JWT no longer travels in the body.
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
    # superadmin is NOT assignable via public self-registration — that role is
    # granted only through operator tooling. Allows admin/client.
    ALLOWED_ROLES = {r.value for r in UserRole} - {UserRole.SUPERADMIN.value}
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
    _set_auth_cookies(response, token, secrets.token_hex(32))

    return _token_response(
        user_id=str(user.id),
        email=user.email,
        name=user.name,
        role=user.role,
        tenant_id=None,
        capabilities=sorted(effective_capabilities(user.role, None)),
    )


@router.post("/switch-tenant")
async def switch_tenant(
    body: SwitchTenantRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    response: Response = None,
) -> t.Any:
    """Switch the current user's active tenant context.

    Validates the user has a UserTenant association with the target tenant,
    checks the tenant is active, then issues a new JWT scoped to that tenant
    and re-issues the session cookie with the new context (AS-3).
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

    # Preserve the global superadmin: users.role is the source of truth for
    # platform operators. A per-tenant ADMIN membership must never downgrade
    # the role inside the token. users.role is a String column and UserRole
    # is a str-enum, so compare against the raw value.
    effective_role: str = ut.role
    if current_user.role == UserRole.SUPERADMIN.value:
        effective_role = UserRole.SUPERADMIN.value

    token = create_access_token(
        str(current_user.id),
        current_user.email,
        role=effective_role,
        tenant_id=str(tenant.id),
    )
    _set_auth_cookies(response, token, secrets.token_hex(32))

    return _token_response(
        user_id=str(current_user.id),
        email=current_user.email,
        name=current_user.name,
        role=effective_role,
        tenant_id=str(tenant.id),
        tenant_plan=tenant.plan,
        payment_status=PaymentStatus.ACTIVE if is_internal_tenant(tenant.slug, settings.internal_tenant_slug) else tenant.payment_status,
        plan_activated_at=getattr(tenant, "plan_activated_at", None),
        capabilities=sorted(effective_capabilities(effective_role, tenant.plan)),
    )


@router.post("/login")
async def login(
    body: LoginRequest,
    session: AsyncSession = Depends(get_session),
    response: Response = None,
) -> t.Any:
    """Login with email and password.

    Sets the httpOnly session cookie (JWT valid for 7 days with role and
    tenant context) + the CSRF double-submit cookie (AS-1). The JWT is no
    longer returned in the JSON body — the cookie IS the session.
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
        # Fetch ALL primary associations. Historical bug: duplicate
        # is_primary=True rows made scalar_one_or_none() raise
        # MultipleResultsFound → HTTP 500 on login. Pick deterministically:
        # prefer the internal tenant, else the first ordered by tenant_id.
        assoc_result = await session.execute(
            select(UserTenant)
            .where(
                UserTenant.user_id == user.id, UserTenant.is_primary == True
            )
            .order_by(UserTenant.tenant_id)
        )
        primaries = list(assoc_result.scalars().all())
        ut = primaries[0] if primaries else None
        if len(primaries) > 1:
            tenants_result = await session.execute(
                select(Tenant).where(Tenant.id.in_([p.tenant_id for p in primaries]))
            )
            slug_by_tenant = {tn.id: tn.slug for tn in tenants_result.scalars().all()}
            for candidate in primaries:
                if is_internal_tenant(
                    slug_by_tenant.get(candidate.tenant_id),
                    settings.internal_tenant_slug,
                ):
                    ut = candidate
                    break
        if ut:
            role = ut.role
            tenant_id = str(ut.tenant_id)
            # Resolve tenant plan + payment info
            tenant = await session.get(Tenant, ut.tenant_id)
            if tenant:
                tenant_plan = tenant.plan
                payment_status = getattr(tenant, "payment_status", None)
                plan_activated_at = getattr(tenant, "plan_activated_at", None)
                # Internal tenant is exempt from payment (configurable)
                if is_internal_tenant(tenant.slug, settings.internal_tenant_slug):
                    payment_status = PaymentStatus.ACTIVE

    token = create_access_token(
        str(user.id), user.email, role=role, tenant_id=tenant_id
    )
    _set_auth_cookies(response, token, secrets.token_hex(32))

    return _token_response(
        user_id=str(user.id),
        email=user.email,
        name=user.name,
        role=role,
        tenant_id=tenant_id,
        tenant_plan=tenant_plan,
        payment_status=payment_status,
        plan_activated_at=plan_activated_at,
        capabilities=sorted(effective_capabilities(role, tenant_plan)),
    )


@router.post("/logout", status_code=200)
async def logout(response: Response) -> dict[str, str]:
    """End the session: expire both cookies server-side (AS-8).

    Idempotent and auth-free — clearing an already-dead session is harmless.
    When the nc_access_token cookie is present the router-level CSRF check
    applies (the browser sends X-CSRF-Token), so a forged logout needs the
    double-submit token.
    """
    _clear_auth_cookies(response)
    return {"status": "ok"}


@router.get("/me", response_model=MeResponse)
async def me(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    request: Request = None,
    response: Response = None,
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
            if is_internal_tenant(tenant.slug, settings.internal_tenant_slug):
                payment_status = PaymentStatus.ACTIVE

    # AS-3: cookie sessions re-issue the session cookie so it reflects the
    # CURRENT role/tenant (current_role comes from the DB, so a role change
    # since login is picked up here). Bearer-only callers (tools) get no
    # cookie; nc_csrf is NOT rotated on this read.
    if request.cookies.get(ACCESS_TOKEN_COOKIE):
        token = create_access_token(
            str(current_user.id),
            current_user.email,
            role=getattr(current_user, "current_role", current_user.role),
            tenant_id=str(current_tid) if current_tid else None,
        )
        _set_auth_cookies(response, token)

    response_model = MeResponse.model_validate(current_user)
    response_model.current_plan = current_plan
    response_model.payment_status = payment_status
    response_model.plan_activated_at = plan_activated_at
    response_model.capabilities = sorted(
        effective_capabilities(
            getattr(current_user, "current_role", current_user.role),
            current_plan,
        )
    )
    return response_model


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
