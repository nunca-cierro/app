"""Tests for Agent CRUD — PATCH /api/v1/agents/{id}.

Covers the gap that let the agent save button bug reach production:
the PATCH endpoint was completely untested.
"""

from __future__ import annotations

import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.modules.agents.models import AiAgent
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User, UserRole
from app.modules.tenants.models import Tenant
from app.db.session import get_session


# ── Helpers ──────────────────────────────────────────────────────────────────

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


def _create_agent(db_session: AsyncSession, tenant_id: uuid.UUID, name: str = "Test Agent") -> AiAgent:
    agent = AiAgent(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        name=name,
        business_config={"instructions": "test"},
        provider="groq",
        model="llama-3.3-70b-versatile",
        temperature=0,
        max_tokens=512,
    )
    db_session.add(agent)
    return agent


# ── Fixture: authenticated client with a real DB user ────────────────────────

@pytest_asyncio.fixture
async def superadmin_client(db_session: AsyncSession) -> AsyncClient:
    """Returns an httpx client authenticated as a superadmin with a tenant context."""
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


# ── PATCH /api/v1/agents/{id} ────────────────────────────────────────────────


class TestUpdateAgent:
    """PATCH /api/v1/agents/{id} — update agent info."""

    @pytest.mark.asyncio
    async def test_update_agent_name(self, superadmin_client: AsyncClient, db_session: AsyncSession):
        """Updating an agent's name works."""
        tenant = _create_tenant(db_session, "Agent Tenant", "agent-tenant")
        await db_session.flush()
        agent = _create_agent(db_session, tenant.id, name="Old Agent Name")
        await db_session.commit()

        response = await superadmin_client.patch(
            f"/api/v1/agents/{agent.id}",
            json={"name": "New Agent Name"},
        )

        assert response.status_code == 200, response.text
        data = response.json()
        assert data["name"] == "New Agent Name"

    @pytest.mark.asyncio
    async def test_update_agent_temperature(self, superadmin_client: AsyncClient, db_session: AsyncSession):
        """Updating an agent's temperature works."""
        tenant = _create_tenant(db_session, "Temp Tenant", "temp-tenant")
        await db_session.flush()
        agent = _create_agent(db_session, tenant.id)
        await db_session.commit()

        response = await superadmin_client.patch(
            f"/api/v1/agents/{agent.id}",
            json={"temperature": 0.7},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["temperature"] == 0.7

    @pytest.mark.asyncio
    async def test_update_agent_business_config(self, superadmin_client: AsyncClient, db_session: AsyncSession):
        """Updating business_config merges correctly."""
        tenant = _create_tenant(db_session, "Config Tenant", "config-tenant")
        await db_session.flush()
        agent = _create_agent(db_session, tenant.id)
        await db_session.commit()

        response = await superadmin_client.patch(
            f"/api/v1/agents/{agent.id}",
            json={"business_config": {"instructions": "updated", "new_field": "value"}},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["business_config"]["instructions"] == "updated"
        assert data["business_config"]["new_field"] == "value"

    @pytest.mark.asyncio
    async def test_update_nonexistent_agent_returns_404(self, superadmin_client: AsyncClient):
        """PATCH on a non-existent agent returns 404."""
        fake_id = uuid.uuid4()
        response = await superadmin_client.patch(f"/api/v1/agents/{fake_id}", json={"name": "X"})
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_agent_tenant_id_is_ignored(self, superadmin_client: AsyncClient, db_session: AsyncSession):
        """PATCH with tenant_id does NOT change the agent's tenant (immutable field)."""
        tenant_a = _create_tenant(db_session, "Tenant A", "tenant-a")
        tenant_b = _create_tenant(db_session, "Tenant B", "tenant-b")
        await db_session.flush()
        agent = _create_agent(db_session, tenant_a.id)
        await db_session.commit()

        response = await superadmin_client.patch(
            f"/api/v1/agents/{agent.id}",
            json={"tenant_id": str(tenant_b.id)},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["tenant_id"] == str(tenant_a.id)
