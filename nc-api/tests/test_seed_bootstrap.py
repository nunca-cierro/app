"""Tests: seed bootstrap self-heals operator role and duplicate primaries.

``bootstrap_platform_integrity`` restores the platform operator (superadmin
downgraded to admin by the tenant-creation bug) and enforces the
single-primary invariant. It must be idempotent — a second run changes
nothing.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.seed import bootstrap_platform_integrity
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


@pytest.mark.asyncio
async def test_bootstrap_elevates_internal_tenant_admins(db_session: AsyncSession):
    """Admin/superadmin memberships on the internal tenant imply a global
    superadmin user; admins of regular tenants are left untouched."""
    internal = _create_tenant_row(db_session, "NuncaCierro", settings.internal_tenant_slug)
    other = _create_tenant_row(db_session, "Client Co", "client-co")
    operator = User(
        id=uuid.uuid4(), email="operator@test.com", password_hash="hash",
        name="Operator", role=UserRole.ADMIN,
    )
    client_admin = User(
        id=uuid.uuid4(), email="client-admin@test.com", password_hash="hash",
        name="Client Admin", role=UserRole.ADMIN,
    )
    db_session.add_all([operator, client_admin])
    await db_session.flush()
    db_session.add(UserTenant(user_id=operator.id, tenant_id=internal.id, role=UserRole.ADMIN, is_primary=True))
    db_session.add(UserTenant(user_id=client_admin.id, tenant_id=other.id, role=UserRole.ADMIN, is_primary=True))
    await db_session.commit()

    elevated, demoted = await bootstrap_platform_integrity(db_session)
    assert (elevated, demoted) == (1, 0)

    await db_session.refresh(operator)
    await db_session.refresh(client_admin)
    assert operator.role == UserRole.SUPERADMIN.value
    assert client_admin.role == UserRole.ADMIN.value

    # Idempotent: a second run is a no-op
    assert await bootstrap_platform_integrity(db_session) == (0, 0)


@pytest.mark.asyncio
async def test_bootstrap_demotes_duplicate_primaries(db_session: AsyncSession):
    """Users with several is_primary=True rows keep only the oldest one."""
    user = User(
        id=uuid.uuid4(), email="dup-primaries@test.com", password_hash="hash",
        name="Dup Primaries", role=UserRole.AGENT,
    )
    db_session.add(user)
    t_old = _create_tenant_row(db_session, "Dup Old", "dup-old")
    t_new = _create_tenant_row(db_session, "Dup New", "dup-new")
    await db_session.flush()
    db_session.add(UserTenant(
        user_id=user.id, tenant_id=t_old.id, role=UserRole.AGENT, is_primary=True,
        created_at=datetime(2026, 1, 1, tzinfo=UTC),
    ))
    db_session.add(UserTenant(
        user_id=user.id, tenant_id=t_new.id, role=UserRole.ADMIN, is_primary=True,
        created_at=datetime(2026, 6, 1, tzinfo=UTC),
    ))
    await db_session.commit()

    elevated, demoted = await bootstrap_platform_integrity(db_session)
    assert (elevated, demoted) == (0, 1)

    result = await db_session.execute(
        select(UserTenant).where(
            UserTenant.user_id == user.id,
            UserTenant.is_primary.is_(True),
        )
    )
    primaries = result.scalars().all()
    assert len(primaries) == 1
    assert primaries[0].tenant_id == t_old.id

    # Idempotent: a second run is a no-op
    assert await bootstrap_platform_integrity(db_session) == (0, 0)
