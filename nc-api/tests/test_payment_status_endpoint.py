"""Tests for PATCH /api/v1/tenants/{id}/payment-status endpoint."""

from __future__ import annotations

import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User, UserRole
from app.modules.tenants.models import Tenant
from app.db.session import get_session


def _create_tenant(db_session: AsyncSession, name: str = "Test Tenant", slug: str = "test-tenant", **kwargs) -> Tenant:
    defaults = {
        "id": uuid.uuid4(),
        "name": name,
        "slug": slug,
        "status": "active",
        "plan": "basic",
        "timezone": "UTC",
        "locale": "en",
        "payment_status": "inactive",
        "plan_activated_at": None,
    }
    defaults.update(kwargs)
    tenant = Tenant(**defaults)
    db_session.add(tenant)
    return tenant


@pytest_asyncio.fixture
async def superadmin_client(db_session: AsyncSession) -> AsyncClient:
    """httpx client authenticated as a superadmin."""
    user = User(
        id=uuid.uuid4(),
        email="superadmin@test.com",
        password_hash="not-a-real-hash",
        name="Test Superadmin",
    )
    db_session.add(user)
    await db_session.flush()

    tenant = _create_tenant(db_session, "Superadmin Home", "superadmin-home")
    await db_session.flush()

    user.current_role = UserRole.SUPERADMIN
    user.current_tenant_id = tenant.id

    async def override_auth() -> User:
        return user

    app.dependency_overrides[get_current_user] = override_auth
    app.dependency_overrides[get_session] = lambda: db_session

    transport = ASGITransport(app=app)  # type: ignore[arg-type]
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def admin_client(db_session: AsyncSession) -> AsyncClient:
    """httpx client authenticated as a regular admin (not superadmin)."""
    user = User(
        id=uuid.uuid4(),
        email="admin@test.com",
        password_hash="not-a-real-hash",
        name="Test Admin",
    )
    db_session.add(user)
    await db_session.flush()

    tenant = _create_tenant(db_session, "Admin Home", "admin-home")
    await db_session.flush()

    user.current_role = UserRole.ADMIN
    user.current_tenant_id = tenant.id

    async def override_auth() -> User:
        return user

    app.dependency_overrides[get_current_user] = override_auth
    app.dependency_overrides[get_session] = lambda: db_session

    transport = ASGITransport(app=app)  # type: ignore[arg-type]
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


class TestPaymentStatusEndpoint:
    """PATCH /api/v1/tenants/{id}/payment-status."""

    @pytest.mark.asyncio
    async def test_superadmin_can_activate(
        self, superadmin_client: AsyncClient, db_session: AsyncSession,
    ):
        """Superadmin activating a tenant returns 200 and sets plan_activated_at."""
        tenant = _create_tenant(db_session)
        await db_session.commit()

        response = await superadmin_client.patch(
            f"/api/v1/tenants/{tenant.id}/payment-status",
            json={"payment_status": "active"},
        )

        assert response.status_code == 200, response.text
        data = response.json()
        assert data["payment_status"] == "active"
        assert data["plan_activated_at"] is not None

    @pytest.mark.asyncio
    async def test_superadmin_can_deactivate(
        self, superadmin_client: AsyncClient, db_session: AsyncSession,
    ):
        """Superadmin deactivating a tenant returns 200 and clears plan_activated_at."""
        from datetime import UTC, datetime
        tenant = _create_tenant(
            db_session,
            payment_status="active",
            plan_activated_at=datetime.now(UTC),
        )
        await db_session.commit()

        response = await superadmin_client.patch(
            f"/api/v1/tenants/{tenant.id}/payment-status",
            json={"payment_status": "inactive"},
        )

        assert response.status_code == 200, response.text
        data = response.json()
        assert data["payment_status"] == "inactive"
        assert data["plan_activated_at"] is None

    @pytest.mark.asyncio
    async def test_non_superadmin_forbidden(
        self, admin_client: AsyncClient, db_session: AsyncSession,
    ):
        """Non-superadmin calling the endpoint returns 403."""
        tenant = _create_tenant(db_session)
        await db_session.commit()

        response = await admin_client.patch(
            f"/api/v1/tenants/{tenant.id}/payment-status",
            json={"payment_status": "active"},
        )

        assert response.status_code == 403, response.text

    @pytest.mark.asyncio
    async def test_invalid_tenant_returns_404(
        self, superadmin_client: AsyncClient,
    ):
        """PATCH on a non-existent tenant returns 404."""
        fake_id = uuid.uuid4()

        response = await superadmin_client.patch(
            f"/api/v1/tenants/{fake_id}/payment-status",
            json={"payment_status": "active"},
        )

        assert response.status_code == 404, response.text
