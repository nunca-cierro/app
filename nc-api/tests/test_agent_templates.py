"""Integration tests for AgentTemplate CRUD + from-template endpoint."""

from __future__ import annotations

import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.agents.template_models import AgentTemplate
from app.modules.agents.templates import SEED_TEMPLATES
from app.modules.auth.models import UserRole


# ── Fixtures ────────────────────────────────────────────────────────────────


@pytest_asyncio.fixture
async def seed_test_template(db_session: AsyncSession) -> AgentTemplate:
    """Create a minimal template for testing CRUD operations."""
    template = AgentTemplate(
        category="test-category",
        name="Test Template",
        description="A template for testing",
        content={
            "instructions": "Eres un asistente para {{business_name}}.",
            "business_info": {
                "name": "{{business_name}}",
                "schedule": "{{business_schedule}}",
            },
            "products_services": [],
            "faq": [],
            "tone": "profesional",
        },
        is_system=True,
    )
    db_session.add(template)
    await db_session.commit()
    await db_session.refresh(template)
    return template


@pytest_asyncio.fixture
async def seed_test_tenant_with_profile(db_session: AsyncSession) -> uuid.UUID:
    """Create a minimal tenant with business_profile for from-template tests."""
    from app.modules.tenants.models import Tenant

    tenant = Tenant(
        name="Test Restaurant",
        slug="test-restaurant",
        category="restaurante",
        business_profile={
            "business_name": "La Casa de las Arepas",
            "business_description": "Auténtica comida colombiana",
            "business_schedule": "Lun–Sáb 8:00–22:00",
            "business_phone": "+57 300 123 4567",
            "business_location": "Calle 45 #23-12, Bogotá",
            "business_website": "https://lacasaarepas.com",
            "business_social": "@lacasaarepas",
        },
    )
    db_session.add(tenant)
    await db_session.commit()
    await db_session.refresh(tenant)
    return tenant.id


@pytest_asyncio.fixture
async def seed_test_tenant_empty_profile(db_session: AsyncSession) -> uuid.UUID:
    """Create a tenant with NULL business_profile."""
    from app.modules.tenants.models import Tenant

    tenant = Tenant(
        name="Empty Profile Tenant",
        slug="empty-profile",
        business_profile=None,
    )
    db_session.add(tenant)
    await db_session.commit()
    await db_session.refresh(tenant)
    return tenant.id


# ── Template CRUD Tests ────────────────────────────────────────────────────


class TestTemplateList:
    @pytest.mark.asyncio
    async def test_list_all_templates(self, client: AsyncClient, seed_test_template: AgentTemplate):
        """GET /agent-templates returns all templates."""
        resp = await client.get("/api/v1/agent-templates")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert any(t["name"] == "Test Template" for t in data)

    @pytest.mark.asyncio
    async def test_list_filter_by_category(self, client: AsyncClient, seed_test_template: AgentTemplate):
        """GET /agent-templates?category=test-category filters correctly."""
        resp = await client.get("/api/v1/agent-templates?category=test-category")
        assert resp.status_code == 200
        data = resp.json()
        assert all(t["category"] == "test-category" for t in data)
        assert any(t["name"] == "Test Template" for t in data)

    @pytest.mark.asyncio
    async def test_list_filter_no_match(self, client: AsyncClient):
        """GET /agent-templates?category=nonexistent returns empty list."""
        resp = await client.get("/api/v1/agent-templates?category=nonexistent")
        assert resp.status_code == 200
        data = resp.json()
        assert data == []


class TestTemplateGet:
    @pytest.mark.asyncio
    async def test_get_by_id(self, client: AsyncClient, seed_test_template: AgentTemplate):
        """GET /agent-templates/{id} returns the template."""
        resp = await client.get(f"/api/v1/agent-templates/{seed_test_template.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Test Template"
        assert data["category"] == "test-category"
        assert data["is_system"] is True

    @pytest.mark.asyncio
    async def test_get_not_found(self, client: AsyncClient):
        """GET /agent-templates/{nonexistent-id} returns 404."""
        fake_id = uuid.uuid4()
        resp = await client.get(f"/api/v1/agent-templates/{fake_id}")
        assert resp.status_code == 404


class TestTemplateCreate:
    @pytest.mark.asyncio
    async def test_create_template(self, client: AsyncClient):
        """POST /agent-templates creates a new template (superadmin)."""
        payload = {
            "category": "new-category",
            "name": "New Template",
            "description": "A brand new template",
            "content": {"instructions": "Hello {{business_name}}.", "business_info": {}, "products_services": [], "faq": [], "tone": "friendly"},
            "is_system": False,
        }
        resp = await client.post("/api/v1/agent-templates", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "New Template"
        assert data["category"] == "new-category"
        assert data["is_system"] is False
        assert "id" in data


class TestTemplateUpdate:
    @pytest.mark.asyncio
    async def test_update_template(self, client: AsyncClient, seed_test_template: AgentTemplate):
        """PATCH /agent-templates/{id} updates fields."""
        resp = await client.patch(
            f"/api/v1/agent-templates/{seed_test_template.id}",
            json={"name": "Updated Template", "description": "Updated description"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Updated Template"
        assert data["description"] == "Updated description"
        # Unchanged fields preserved
        assert data["category"] == "test-category"


class TestTemplateDelete:
    @pytest.mark.asyncio
    async def test_delete_template(self, client: AsyncClient, seed_test_template: AgentTemplate):
        """DELETE /agent-templates/{id} returns 204."""
        resp = await client.delete(f"/api/v1/agent-templates/{seed_test_template.id}")
        assert resp.status_code == 204

        # Confirm deleted
        resp = await client.get(f"/api/v1/agent-templates/{seed_test_template.id}")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_not_found(self, client: AsyncClient):
        """DELETE /agent-templates/{nonexistent-id} returns 404."""
        fake_id = uuid.uuid4()
        resp = await client.delete(f"/api/v1/agent-templates/{fake_id}")
        assert resp.status_code == 404


# ── From-Template Tests ────────────────────────────────────────────────────


class TestAgentFromTemplate:
    @pytest.mark.asyncio
    async def test_create_from_template_happy_path(
        self,
        client: AsyncClient,
        seed_test_template: AgentTemplate,
        seed_test_tenant_with_profile: uuid.UUID,
    ):
        """POST /agents/from-template creates agent with resolved placeholders."""
        resp = await client.post(
            "/api/v1/agents/from-template",
            json={
                "tenant_id": str(seed_test_tenant_with_profile),
                "template_id": str(seed_test_template.id),
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == seed_test_template.name
        assert data["tenant_id"] == str(seed_test_tenant_with_profile)

        # Verify placeholders resolved
        bc = data.get("business_config", {})
        assert bc.get("business_info", {}).get("name") == "La Casa de las Arepas"
        assert (
            bc.get("business_info", {}).get("schedule") == "Lun–Sáb 8:00–22:00"
        )

    @pytest.mark.asyncio
    async def test_create_from_template_empty_profile(
        self,
        client: AsyncClient,
        seed_test_template: AgentTemplate,
        seed_test_tenant_empty_profile: uuid.UUID,
    ):
        """POST /agents/from-template with NULL profile cleans all placeholders."""
        resp = await client.post(
            "/api/v1/agents/from-template",
            json={
                "tenant_id": str(seed_test_tenant_empty_profile),
                "template_id": str(seed_test_template.id),
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        bc = data.get("business_config", {})
        # All placeholders cleaned to empty string
        assert bc.get("business_info", {}).get("name") == ""
        assert bc.get("business_info", {}).get("schedule") == ""

    @pytest.mark.asyncio
    async def test_create_from_template_with_custom_name(
        self,
        client: AsyncClient,
        seed_test_template: AgentTemplate,
        seed_test_tenant_with_profile: uuid.UUID,
    ):
        """POST /agents/from-template with custom name overrides template name."""
        resp = await client.post(
            "/api/v1/agents/from-template",
            json={
                "tenant_id": str(seed_test_tenant_with_profile),
                "template_id": str(seed_test_template.id),
                "name": "Mi Restaurante Personalizado",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Mi Restaurante Personalizado"

    @pytest.mark.asyncio
    async def test_create_from_template_with_overrides(
        self,
        client: AsyncClient,
        seed_test_template: AgentTemplate,
        seed_test_tenant_with_profile: uuid.UUID,
    ):
        """POST /agents/from-template with overrides merges on top of resolved content."""
        resp = await client.post(
            "/api/v1/agents/from-template",
            json={
                "tenant_id": str(seed_test_tenant_with_profile),
                "template_id": str(seed_test_template.id),
                "overrides": {"tone": "formal", "fallback_message": "Custom fallback."},
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        bc = data.get("business_config", {})
        # Overrides win
        assert bc.get("tone") == "formal"
        assert bc.get("fallback_message") == "Custom fallback."
        # Resolved fields still present
        assert bc.get("business_info", {}).get("name") == "La Casa de las Arepas"

    @pytest.mark.asyncio
    async def test_create_from_template_tenant_not_found(
        self,
        client: AsyncClient,
        seed_test_template: AgentTemplate,
    ):
        """POST /agents/from-template with invalid tenant_id returns 404."""
        fake_id = uuid.uuid4()
        resp = await client.post(
            "/api/v1/agents/from-template",
            json={
                "tenant_id": str(fake_id),
                "template_id": str(seed_test_template.id),
            },
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_create_from_template_template_not_found(
        self,
        client: AsyncClient,
        seed_test_tenant_with_profile: uuid.UUID,
    ):
        """POST /agents/from-template with invalid template_id returns 404."""
        fake_id = uuid.uuid4()
        resp = await client.post(
            "/api/v1/agents/from-template",
            json={
                "tenant_id": str(seed_test_tenant_with_profile),
                "template_id": str(fake_id),
            },
        )
        assert resp.status_code == 404


# ── Seed Idempotency Tests ─────────────────────────────────────────────────


class TestSeedIdempotency:
    @pytest.mark.asyncio
    async def test_seed_templates_idempotent(
        self, db_session: AsyncSession, seed_test_template: AgentTemplate
    ):
        """Running seed twice does not create duplicate templates."""
        from app.seed import _seed_templates

        # First seed run — populates all seed templates
        await _seed_templates(db_session)

        result = await db_session.execute(select(AgentTemplate))
        count_after_first_seed = len(result.scalars().all())

        # Run seed again — should not create any new templates
        await _seed_templates(db_session)

        result = await db_session.execute(select(AgentTemplate))
        templates = result.scalars().all()
        assert len(templates) == count_after_first_seed

        # Verify SEED_TEMPLATES upsert doesn't duplicate existing test template
        names = [t.name for t in templates]
        assert names.count("Test Template") == 1
