"""Tests for switch-tenant endpoint — JWT re-issuance for multi-tenant users."""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User, UserRole
from app.modules.auth.user_tenant import UserTenant
from app.modules.tenants.models import Tenant


def _create_tenant(db_session: AsyncSession, name: str, slug: str, status: str = "active") -> Tenant:
    tenant = Tenant(
        id=uuid.uuid4(),
        name=name,
        slug=slug,
        status=status,
        plan="basic",
        timezone="UTC",
        locale="en",
    )
    db_session.add(tenant)
    return tenant


@pytest.mark.asyncio
async def test_switch_tenant_valid(client: AsyncClient, db_session: AsyncSession):
    """Valid switch returns 200 with new JWT scoped to target tenant."""
    # Setup: user with two tenants
    user = User(
        id=uuid.uuid4(),
        email="multi@test.com",
        name="Multi Tenant User",
        password_hash="hash",
    )
    db_session.add(user)

    t1 = _create_tenant(db_session, "Tenant 1", "t1")
    t2 = _create_tenant(db_session, "Tenant 2", "t2")
    await db_session.flush()

    ut1 = UserTenant(user_id=user.id, tenant_id=t1.id, role=UserRole.ADMIN, is_primary=True)
    ut2 = UserTenant(user_id=user.id, tenant_id=t2.id, role=UserRole.AGENT, is_primary=False)
    db_session.add(ut1)
    db_session.add(ut2)
    await db_session.commit()

    # Override auth
    setattr(user, "current_role", UserRole.ADMIN)
    setattr(user, "current_tenant_id", t1.id)

    async def mock_get_current_user():
        return user

    app.dependency_overrides[get_current_user] = mock_get_current_user

    try:
        response = await client.post(
            "/api/v1/auth/switch-tenant",
            json={"tenant_id": str(t2.id)},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["tenant_id"] == str(t2.id)
        assert data["role"] == UserRole.AGENT

        # Verify JWT contains new tenant context
        from jose import jwt
        from app.core.config import settings

        decoded = jwt.decode(data["access_token"], settings.jwt_secret, algorithms=["HS256"])
        assert decoded["role"] == UserRole.AGENT
        assert decoded["tenant_id"] == str(t2.id)
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_switch_tenant_unauthorized_tenant_returns_403(client: AsyncClient, db_session: AsyncSession):
    """Switch to a tenant the user is not a member of returns 403."""
    user = User(
        id=uuid.uuid4(),
        email="single@test.com",
        name="Single Tenant User",
        password_hash="hash",
    )
    db_session.add(user)

    t1 = _create_tenant(db_session, "My Tenant", "my-tenant")
    other = _create_tenant(db_session, "Other Tenant", "other")
    await db_session.flush()

    ut = UserTenant(user_id=user.id, tenant_id=t1.id, role=UserRole.ADMIN, is_primary=True)
    db_session.add(ut)
    await db_session.commit()

    setattr(user, "current_role", UserRole.ADMIN)
    setattr(user, "current_tenant_id", t1.id)

    async def mock_get_current_user():
        return user

    app.dependency_overrides[get_current_user] = mock_get_current_user

    try:
        response = await client.post(
            "/api/v1/auth/switch-tenant",
            json={"tenant_id": str(other.id)},
        )
        assert response.status_code == 403
        assert "Not a member of this tenant" in response.text
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_switch_tenant_no_membership_returns_403(client: AsyncClient, db_session: AsyncSession):
    """Switch to a tenant the user has no membership for returns 403 (before tenant lookup)."""
    user = User(
        id=uuid.uuid4(),
        email="ghost@test.com",
        name="Ghost User",
        password_hash="hash",
    )
    db_session.add(user)

    t1 = _create_tenant(db_session, "Ghost Tenant", "ghost")
    await db_session.flush()

    ut = UserTenant(user_id=user.id, tenant_id=t1.id, role=UserRole.ADMIN, is_primary=True)
    db_session.add(ut)
    await db_session.commit()

    setattr(user, "current_role", UserRole.ADMIN)
    setattr(user, "current_tenant_id", t1.id)

    async def mock_get_current_user():
        return user

    app.dependency_overrides[get_current_user] = mock_get_current_user

    other_tenant_id = uuid.uuid4()
    try:
        response = await client.post(
            "/api/v1/auth/switch-tenant",
            json={"tenant_id": str(other_tenant_id)},
        )
        # 403 because user is not a member of other_tenant_id (checked before tenant lookup)
        assert response.status_code == 403
        assert "Not a member" in response.text
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_switch_tenant_suspended_returns_403(client: AsyncClient, db_session: AsyncSession):
    """Switch to a suspended tenant returns 403."""
    user = User(
        id=uuid.uuid4(),
        email="suspended@test.com",
        name="Suspended User",
        password_hash="hash",
    )
    db_session.add(user)

    active_t = _create_tenant(db_session, "Active Tenant", "active")
    suspended_t = _create_tenant(db_session, "Suspended Tenant", "suspended", status="suspended")
    await db_session.flush()

    ut1 = UserTenant(user_id=user.id, tenant_id=active_t.id, role=UserRole.ADMIN, is_primary=True)
    ut2 = UserTenant(user_id=user.id, tenant_id=suspended_t.id, role=UserRole.AGENT, is_primary=False)
    db_session.add(ut1)
    db_session.add(ut2)
    await db_session.commit()

    setattr(user, "current_role", UserRole.ADMIN)
    setattr(user, "current_tenant_id", active_t.id)

    async def mock_get_current_user():
        return user

    app.dependency_overrides[get_current_user] = mock_get_current_user

    try:
        response = await client.post(
            "/api/v1/auth/switch-tenant",
            json={"tenant_id": str(suspended_t.id)},
        )
        assert response.status_code == 403
        assert "not active" in response.text.lower()
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_switch_tenant_unauthenticated_returns_401(client: AsyncClient, db_session: AsyncSession):
    """Calling switch-tenant without auth returns 401.

    The default client fixture overrides get_current_user, so we clear
    the override temporarily to simulate an unauthenticated request.
    """
    from app.modules.auth.deps import get_current_user

    # Clear auth override temporarily
    old_override = app.dependency_overrides.pop(get_current_user, None)
    try:
        response = await client.post(
            "/api/v1/auth/switch-tenant",
            json={"tenant_id": str(uuid.uuid4())},
        )
        assert response.status_code == 401
    finally:
        if old_override:
            app.dependency_overrides[get_current_user] = old_override


@pytest.mark.asyncio
async def test_switch_tenant_request_validation(client: AsyncClient, db_session: AsyncSession):
    """Invalid UUID in tenant_id returns 422."""
    response = await client.post(
        "/api/v1/auth/switch-tenant",
        json={"tenant_id": "not-a-uuid"},
    )
    assert response.status_code == 422
