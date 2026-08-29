"""Tests: POST /auth/login is resilient to duplicate primary associations.

Regression coverage for the prod incident where a user with TWO
``is_primary=True`` UserTenant rows made ``scalar_one_or_none()`` raise
``MultipleResultsFound`` → HTTP 500 on every login attempt.
"""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.modules.auth.models import User, UserRole
from app.modules.auth.service import hash_password
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


def _user_with_primary(
    db_session: AsyncSession, email: str, tenants: list[Tenant],
) -> User:
    user = User(
        id=uuid.uuid4(),
        email=email,
        password_hash=hash_password("secret123"),
        name="Dup Primary User",
        role=UserRole.ADMIN,
    )
    db_session.add(user)
    for tenant in tenants:
        db_session.add(
            UserTenant(
                user_id=user.id,
                tenant_id=tenant.id,
                role=UserRole.ADMIN,
                is_primary=True,
            )
        )
    return user


@pytest.mark.asyncio
async def test_login_with_duplicate_primaries_does_not_500(
    client: AsyncClient, db_session: AsyncSession,
):
    """Two primary rows used to raise MultipleResultsFound → 500. Login must
    succeed and pick one of the primary tenants deterministically."""
    t1 = _create_tenant_row(db_session, "Dup One", "dup-one")
    t2 = _create_tenant_row(db_session, "Dup Two", "dup-two")
    user = _user_with_primary(db_session, "dup-primary@test.com", [t1, t2])
    await db_session.commit()

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "dup-primary@test.com", "password": "secret123"},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["tenant_id"] in {str(t1.id), str(t2.id)}


@pytest.mark.asyncio
async def test_login_prefers_internal_tenant_among_duplicate_primaries(
    client: AsyncClient, db_session: AsyncSession,
):
    """When one of the duplicate primaries belongs to the internal tenant,
    login resolves the session to that tenant."""
    internal = _create_tenant_row(db_session, "NuncaCierro", settings.internal_tenant_slug)
    other = _create_tenant_row(db_session, "Other Dup", "other-dup")
    user = _user_with_primary(db_session, "internal-pref@test.com", [other, internal])
    await db_session.commit()

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "internal-pref@test.com", "password": "secret123"},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["tenant_id"] == str(internal.id)
    # Internal tenant is exempt from payment enforcement
    assert data["payment_status"] == "active"
