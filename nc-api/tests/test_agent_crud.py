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
from app.modules.agents.template_models import AgentTemplate
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User, UserRole
from app.modules.tenants.models import Tenant
from app.db.session import get_session


# ── Helpers ──────────────────────────────────────────────────────────────────

def _create_tenant(db_session: AsyncSession, name: str, slug: str, plan: str = "basic") -> Tenant:
    tenant = Tenant(
        id=uuid.uuid4(),
        name=name,
        slug=slug,
        status="active",
        plan=plan,
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
        model="openai/gpt-oss-120b",
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


@pytest_asyncio.fixture
async def admin_client_factory(db_session: AsyncSession):
    """Factory: httpx client authenticated as an ADMIN of a tenant on the given plan.

    Returns ``(client, tenant)`` so tests can create agents under the same tenant
    (tenant isolation requires the agent to live in the caller's tenant).
    """
    clients: list[AsyncClient] = []

    async def _build(plan: str) -> tuple[AsyncClient, Tenant]:
        tenant = _create_tenant(
            db_session,
            name=f"Admin Tenant {plan}",
            slug=f"admin-tenant-{plan}",
            plan=plan,
        )
        await db_session.flush()

        user = User(
            id=uuid.uuid4(),
            email=f"admin-{plan}@test.com",
            password_hash="not-a-real-hash",
            name=f"Admin {plan}",
        )
        db_session.add(user)
        await db_session.flush()

        user.current_role = UserRole.ADMIN
        user.current_tenant_id = tenant.id

        async def override_auth() -> User:
            return user

        app.dependency_overrides[get_current_user] = override_auth
        app.dependency_overrides[get_session] = lambda: db_session

        transport = ASGITransport(app=app)  # type: ignore[arg-type]
        client = AsyncClient(transport=transport, base_url="http://test")
        clients.append(client)
        return client, tenant

    yield _build

    app.dependency_overrides.clear()
    for client in clients:
        await client.aclose()


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


# ── PATCH business_config → CAP_BUSINESS_EDIT gate ──────────────────────────
# Audit finding (2026-08-05): the business_config capability gate on PATCH was
# only exercised via the superadmin path — no 403-path test existed. These
# tests cover the effective server-side behavior for tenant admins.


class TestUpdateAgentBusinessConfigCapabilityGate:
    """PATCH /api/v1/agents/{id} + business_config → business.edit capability."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        ("plan", "expected_detail"),
        [
            (
                "basic",
                "Tu plan actual (basic) no incluye esta función. "
                "Contacta a tu administrador para hacer upgrade.",
            ),
            (
                "trial",
                "Tu plan actual (trial) no incluye esta función. "
                "Contacta a tu administrador para hacer upgrade.",
            ),
        ],
    )
    async def test_business_config_update_denied_without_capability(
        self,
        admin_client_factory,
        db_session: AsyncSession,
        plan: str,
        expected_detail: str,
    ):
        """ADMIN on a plan lacking CAP_BUSINESS_EDIT gets 403 — and no write happens.

        The rejection fires in the ``agents.manage`` dependency (plan gate)
        before the endpoint's inline ``business_config`` gate is reached, so the
        error shape is the dependency's plan-gate detail.
        """
        client, tenant = await admin_client_factory(plan)
        agent = _create_agent(db_session, tenant.id)
        await db_session.commit()

        response = await client.patch(
            f"/api/v1/agents/{agent.id}",
            json={"business_config": {"instructions": "should-not-persist"}},
        )

        assert response.status_code == 403
        assert response.json()["detail"] == expected_detail

        # The gate must reject BEFORE any write lands in the DB
        await db_session.refresh(agent)
        assert agent.business_config == {"instructions": "test"}

    @pytest.mark.asyncio
    @pytest.mark.parametrize("plan", ["professional", "enterprise"])
    async def test_business_config_update_allowed_with_capability(
        self,
        admin_client_factory,
        db_session: AsyncSession,
        plan: str,
    ):
        """ADMIN on a plan with CAP_BUSINESS_EDIT gets 200 and the config updates."""
        client, tenant = await admin_client_factory(plan)
        agent = _create_agent(db_session, tenant.id)
        await db_session.commit()

        response = await client.patch(
            f"/api/v1/agents/{agent.id}",
            json={"business_config": {"instructions": "updated", "new_field": "value"}},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["business_config"]["instructions"] == "updated"
        assert data["business_config"]["new_field"] == "value"


# ── PATCH validation (R5) + merge semantics (R6) + canonical defaults (R7) ───


class TestPatchValidation:
    """PATCH /api/v1/agents/{id} — schema validators reject invalid values."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        ("payload", "expected_current"),
        [
            ({"max_tokens": 0}, {"max_tokens": 512}),
            ({"max_tokens": 32}, {"max_tokens": 512}),  # below the shared floor (64)
            ({"temperature": 2.5}, {"temperature": 0}),
            ({"provider": "made-up"}, {"provider": "groq"}),
        ],
    )
    async def test_invalid_patch_values_rejected_422(
        self,
        superadmin_client: AsyncClient,
        db_session: AsyncSession,
        payload: dict,
        expected_current: dict,
    ):
        """Invalid max_tokens/temperature/provider → 422 and the agent is unchanged."""
        tenant = _create_tenant(db_session, "Validation Tenant", "validation-tenant")
        await db_session.flush()
        agent = _create_agent(db_session, tenant.id)
        await db_session.commit()

        response = await superadmin_client.patch(
            f"/api/v1/agents/{agent.id}", json=payload
        )

        assert response.status_code == 422
        await db_session.refresh(agent)
        for field, value in expected_current.items():
            assert getattr(agent, field) == value


class TestCreateValidation:
    """POST /api/v1/agents — create enforces the SAME param rules as PATCH.

    Validation symmetry: provider/temperature/max_tokens are rejected on
    create too (previously only PATCH validated them), with the shared
    max_tokens floor of 64 matching the frontend zod schema.
    """

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "payload",
        [
            {"max_tokens": 32},  # below the shared floor (frontend zod min = 64)
            {"temperature": 2.5},
            {"provider": "made-up"},
        ],
    )
    async def test_invalid_create_values_rejected_422(
        self,
        superadmin_client: AsyncClient,
        db_session: AsyncSession,
        payload: dict,
    ):
        tenant = _create_tenant(db_session, "Create Validation Tenant", "create-validation")
        await db_session.commit()

        response = await superadmin_client.post(
            "/api/v1/agents",
            json={"tenant_id": str(tenant.id), "name": "Validation Agent", **payload},
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_accepts_floor_max_tokens_64(
        self, superadmin_client: AsyncClient, db_session: AsyncSession
    ):
        """Boundary: the shared floor itself is a valid create value."""
        tenant = _create_tenant(db_session, "Floor Tenant", "floor-tenant")
        await db_session.commit()

        response = await superadmin_client.post(
            "/api/v1/agents",
            json={"tenant_id": str(tenant.id), "name": "Floor Agent", "max_tokens": 64},
        )

        assert response.status_code == 201
        assert response.json()["max_tokens"] == 64


class TestBusinessConfigMerge:
    """PATCH business_config — shallow top-level merge semantics (R6)."""

    @pytest.mark.asyncio
    async def test_merge_preserves_omitted_keys(
        self, superadmin_client: AsyncClient, db_session: AsyncSession
    ):
        """Provided keys replace their value; omitted keys are preserved."""
        tenant = _create_tenant(db_session, "Merge Tenant", "merge-tenant")
        await db_session.flush()
        agent = AiAgent(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            name="Merge Agent",
            business_config={"instructions": "keep-me", "faq": "old-faq"},
            provider="groq",
            model="openai/gpt-oss-120b",
            temperature=0,
            max_tokens=512,
        )
        db_session.add(agent)
        await db_session.commit()

        response = await superadmin_client.patch(
            f"/api/v1/agents/{agent.id}",
            json={"business_config": {"faq": "new-faq"}},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["business_config"]["faq"] == "new-faq"
        assert data["business_config"]["instructions"] == "keep-me"


class TestCanonicalMaxTokens:
    """Agent creation defaults max_tokens=1024 across all paths (R7)."""

    @pytest.mark.asyncio
    async def test_create_agent_defaults_max_tokens_1024(
        self, superadmin_client: AsyncClient, db_session: AsyncSession
    ):
        tenant = _create_tenant(db_session, "Default Tenant", "default-tenant")
        await db_session.commit()

        response = await superadmin_client.post(
            "/api/v1/agents",
            json={"tenant_id": str(tenant.id), "name": "Default Agent"},
        )

        assert response.status_code == 201
        assert response.json()["max_tokens"] == 1024

    @pytest.mark.asyncio
    async def test_create_agent_from_template_defaults_max_tokens_1024(
        self, superadmin_client: AsyncClient, db_session: AsyncSession
    ):
        tenant = _create_tenant(db_session, "Template Tenant", "template-tenant")
        await db_session.flush()
        template = AgentTemplate(
            id=uuid.uuid4(),
            category="support",
            name="Support Template",
            content={"instructions": "be nice"},
        )
        db_session.add(template)
        await db_session.commit()

        response = await superadmin_client.post(
            "/api/v1/agents/from-template",
            json={"tenant_id": str(tenant.id), "template_id": str(template.id)},
        )

        assert response.status_code == 201
        assert response.json()["max_tokens"] == 1024
