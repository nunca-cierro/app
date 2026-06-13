"""Tests for Tenant CRUD — POST / PATCH / DELETE /api/v1/tenants.

Covers the bugs that made it to production:
- 500 on POST due to missing select import (now fixed — covered by Happy path)
- 409 on duplicate slug (covered by test_create_duplicate_slug)
"""

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


# ── Helpers ──────────────────────────────────────────────────────────────────

def _tenant_payload(name: str = "Test Business", **kw) -> dict:
    return {"name": name, "slug": name.lower().replace(" ", "-"), "plan": "basic", **kw}


def _create_tenant(db_session: AsyncSession, name: str, slug: str) -> Tenant:
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


# ── Fixture: authenticated client with a real DB user ────────────────────────

@pytest_asyncio.fixture
async def superadmin_client(db_session: AsyncSession) -> AsyncClient:
    """Returns an httpx client authenticated as a superadmin with a tenant context.

    The user is persisted in the DB so foreign key constraints are satisfied
    when the endpoint auto-creates UserTenant associations.
    """
    user = User(
        id=uuid.uuid4(),
        email="superadmin@test.com",
        password_hash="not-a-real-hash",
        name="Test Superadmin",
    )
    db_session.add(user)
    await db_session.flush()

    # Give the user a tenant context to prevent tenantless auto-assignment
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


# ── POST /api/v1/tenants ─────────────────────────────────────────────────────


class TestCreateTenant:
    """POST /api/v1/tenants — create a new business."""

    @pytest.mark.asyncio
    async def test_create_tenant_happy_path(self, superadmin_client: AsyncClient):
        """Creating a tenant with valid data returns 201 + correct shape."""
        payload = _tenant_payload(name="Happy Business")
        response = await superadmin_client.post("/api/v1/tenants", json=payload)

        assert response.status_code == 201, response.text
        data = response.json()
        assert data["name"] == "Happy Business"
        assert data["slug"] == "happy-business"
        assert data["status"] == "active"
        assert data["plan"] == "basic"
        assert "id" in data

    @pytest.mark.asyncio
    async def test_create_tenant_duplicate_slug_returns_409(
        self, superadmin_client: AsyncClient, db_session: AsyncSession,
    ):
        """Creating a tenant with an existing slug returns 409, not 500."""
        _create_tenant(db_session, "Existing Co", "existing-co")
        await db_session.commit()

        payload = _tenant_payload(name="Existing Co", slug="existing-co")
        response = await superadmin_client.post("/api/v1/tenants", json=payload)

        assert response.status_code == 409, response.text

    @pytest.mark.asyncio
    async def test_create_tenant_missing_required_fields_returns_422(
        self, superadmin_client: AsyncClient,
    ):
        """Missing name returns 422 validation error."""
        response = await superadmin_client.post("/api/v1/tenants", json={"slug": "no-name"})
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_tenant_empty_body_returns_422(self, superadmin_client: AsyncClient):
        """Empty body returns 422."""
        response = await superadmin_client.post("/api/v1/tenants", json={})
        assert response.status_code == 422


# ── PATCH /api/v1/tenants/{id} ───────────────────────────────────────────────


class TestUpdateTenant:
    """PATCH /api/v1/tenants/{id} — update tenant info."""

    @pytest.mark.asyncio
    async def test_update_tenant_name(self, superadmin_client: AsyncClient, db_session: AsyncSession):
        """Updating a tenant's name works."""
        tenant = _create_tenant(db_session, "Old Name", "old-name")
        await db_session.commit()

        response = await superadmin_client.patch(
            f"/api/v1/tenants/{tenant.id}",
            json={"name": "New Name"},
        )

        assert response.status_code == 200, response.text
        data = response.json()
        assert data["name"] == "New Name"

    @pytest.mark.asyncio
    async def test_update_nonexistent_tenant_returns_404(self, superadmin_client: AsyncClient):
        """PATCH on a non-existent tenant returns 404."""
        fake_id = uuid.uuid4()
        response = await superadmin_client.patch(f"/api/v1/tenants/{fake_id}", json={"name": "X"})
        assert response.status_code == 404


# ── DELETE /api/v1/tenants/{id} ──────────────────────────────────────────────


class TestDeleteTenant:
    """DELETE /api/v1/tenants/{id} — remove a tenant."""

    @pytest.mark.asyncio
    async def test_delete_tenant(self, superadmin_client: AsyncClient, db_session: AsyncSession):
        """Deleting an existing tenant returns 204."""
        tenant = _create_tenant(db_session, "To Delete", "to-delete")
        await db_session.commit()

        response = await superadmin_client.delete(f"/api/v1/tenants/{tenant.id}")
        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_nonexistent_tenant_returns_404(self, superadmin_client: AsyncClient):
        """DELETE on a non-existent tenant returns 404."""
        fake_id = uuid.uuid4()
        response = await superadmin_client.delete(f"/api/v1/tenants/{fake_id}")
        assert response.status_code == 404
