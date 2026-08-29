"""Tests: POST /tenants never downgrades users.role and keeps a single primary.

Regression coverage for the prod incident where the tenantless auto-assign
branch set ``users.role = admin`` on a global superadmin and left duplicate
``is_primary=True`` rows (which later broke login with MultipleResultsFound).
"""

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


def _create_tenant_row(db_session: AsyncSession, name: str, slug: str) -> Tenant:
    tenant = Tenant(
        id=uuid.uuid4(),
        name=name,
        slug=slug,
        status="active",
        plan="basic",
        timezone="UTC",
        locale="en",
    )
    db_session.add(tenant)
    return tenant


def _superadmin_user(email: str) -> User:
    return User(
        id=uuid.uuid4(),
        email=email,
        password_hash="hash",
        name="Global Superadmin",
        role=UserRole.SUPERADMIN,
    )


def _override_auth_as_tenantless_superadmin(user: User) -> None:
    """JWT context: global superadmin with NO active tenant (tenantless)."""
    setattr(user, "current_role", UserRole.SUPERADMIN)
    setattr(user, "current_tenant_id", None)

    async def override_auth() -> User:
        return user

    app.dependency_overrides[get_current_user] = override_auth


@pytest.mark.asyncio
async def test_create_tenant_by_superadmin_does_not_downgrade_role(
    client: AsyncClient, db_session: AsyncSession,
):
    """Tenant creation must NEVER touch users.role — a global superadmin
    stays superadmin in the DB after the tenantless auto-assign branch."""
    user = _superadmin_user("sa-tenantless@test.com")
    db_session.add(user)
    await db_session.commit()

    _override_auth_as_tenantless_superadmin(user)
    try:
        response = await client.post(
            "/api/v1/tenants",
            json={"name": "Incident Biz", "slug": "incident-biz", "plan": "basic"},
        )
        assert response.status_code == 201, response.text

        await db_session.refresh(user)
        assert user.role == UserRole.SUPERADMIN.value
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_create_tenant_demotes_old_primary(
    client: AsyncClient, db_session: AsyncSession,
):
    """After auto-assigning the new membership as primary, the user's older
    primary associations are demoted — exactly one is_primary remains."""
    user = _superadmin_user("sa-demote@test.com")
    db_session.add(user)
    old_tenant = _create_tenant_row(db_session, "Old Primary", "old-primary-t")
    await db_session.flush()
    db_session.add(
        UserTenant(
            user_id=user.id,
            tenant_id=old_tenant.id,
            role=UserRole.ADMIN,
            is_primary=True,
        )
    )
    await db_session.commit()

    _override_auth_as_tenantless_superadmin(user)
    try:
        response = await client.post(
            "/api/v1/tenants",
            json={"name": "Second Biz", "slug": "second-biz", "plan": "basic"},
        )
        assert response.status_code == 201, response.text
        new_tenant_id = response.json()["id"]

        result = await db_session.execute(
            select(UserTenant).where(
                UserTenant.user_id == user.id,
                UserTenant.is_primary.is_(True),
            )
        )
        primaries = result.scalars().all()
        assert len(primaries) == 1
        assert str(primaries[0].tenant_id) == new_tenant_id
    finally:
        app.dependency_overrides.clear()
