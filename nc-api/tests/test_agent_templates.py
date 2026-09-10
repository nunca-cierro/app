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
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User, UserRole
from app.modules.tenants.models import Tenant
from app.main import app


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


@pytest_asyncio.fixture
async def internal_template(db_session: AsyncSession) -> AgentTemplate:
    """Create a system template for an INTERNAL (superadmin-only) category."""
    template = AgentTemplate(
        category="nuncacierro",
        name="NuncaCierro 💼",
        description="Internal B2B sales template",
        content={
            "instructions": "Eres Nicolás, asesor de {{business_name}}.",
            "business_info": {"name": "{{business_name}}"},
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


async def _create_tenant_user(
    db_session: AsyncSession,
    role: UserRole,
    plan: str = "professional",
) -> User:
    """Create a tenant + user with role/tenant context for auth overrides."""
    tenant = Tenant(
        id=uuid.uuid4(),
        name="B2B Tenant",
        slug=f"b2b-tenant-{uuid.uuid4().hex[:8]}",
        status="active",
        plan=plan,
        timezone="UTC",
        locale="es",
    )
    db_session.add(tenant)
    await db_session.flush()

    user = User(
        id=uuid.uuid4(),
        email=f"{role.value}-{uuid.uuid4().hex[:8]}@test.com",
        password_hash="not-a-real-hash",
        name="B2B User",
        role=role,
    )
    db_session.add(user)
    await db_session.flush()

    user.current_role = role
    user.current_tenant_id = tenant.id
    await db_session.commit()
    return user


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

    @pytest.mark.asyncio
    async def test_list_filter_matches_legacy_category_alias(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Canonical filters include templates stored with a legacy label."""
        db_session.add(
            AgentTemplate(
                category="Clínica Dental",
                name="Legacy Clinic Template",
                content={"instructions": "legacy"},
                is_system=False,
            )
        )
        await db_session.commit()

        resp = await client.get("/api/v1/agent-templates?category=clinica")
        assert resp.status_code == 200
        data = resp.json()
        assert any(t["name"] == "Legacy Clinic Template" for t in data)


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


# ── Internal (superadmin-only) templates ────────────────────────────────────
# The company's own B2B sales template ("nuncacierro") is internal: visible and
# usable ONLY by superadmin. Non-superadmin callers must not even know it exists
# (404, never 403 — no existence leak).


class TestInternalTemplateVisibility:
    @pytest.mark.asyncio
    async def test_non_superadmin_does_not_see_internal_template(
        self, client: AsyncClient, db_session: AsyncSession, internal_template: AgentTemplate
    ):
        """ADMIN listing templates does NOT include the internal category."""
        user = await _create_tenant_user(db_session, UserRole.ADMIN)

        async def override_auth() -> User:
            return user

        app.dependency_overrides[get_current_user] = override_auth

        resp = await client.get("/api/v1/agent-templates")
        assert resp.status_code == 200
        names = [t["name"] for t in resp.json()]
        assert internal_template.name not in names

    @pytest.mark.asyncio
    async def test_superadmin_sees_internal_template(
        self, client: AsyncClient, internal_template: AgentTemplate
    ):
        """SUPERADMIN (default test client) DOES see the internal template."""
        resp = await client.get("/api/v1/agent-templates")
        assert resp.status_code == 200
        names = [t["name"] for t in resp.json()]
        assert internal_template.name in names

    @pytest.mark.asyncio
    async def test_non_superadmin_category_filter_hides_internal(
        self, client: AsyncClient, db_session: AsyncSession, internal_template: AgentTemplate
    ):
        """Even an explicit category filter must not reveal internal templates."""
        user = await _create_tenant_user(db_session, UserRole.ADMIN)

        async def override_auth() -> User:
            return user

        app.dependency_overrides[get_current_user] = override_auth

        resp = await client.get("/api/v1/agent-templates?category=nuncacierro")
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_non_superadmin_from_template_internal_returns_404(
        self, client: AsyncClient, db_session: AsyncSession, internal_template: AgentTemplate
    ):
        """ADMIN creating an agent from the internal template gets 404."""
        user = await _create_tenant_user(db_session, UserRole.ADMIN)

        async def override_auth() -> User:
            return user

        app.dependency_overrides[get_current_user] = override_auth

        resp = await client.post(
            "/api/v1/agents/from-template",
            json={
                "tenant_id": str(user.current_tenant_id),
                "template_id": str(internal_template.id),
            },
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_non_superadmin_get_by_id_internal_returns_404(
        self, client: AsyncClient, db_session: AsyncSession, internal_template: AgentTemplate
    ):
        """ADMIN fetching the internal template by id gets 404 (no existence leak)."""
        user = await _create_tenant_user(db_session, UserRole.ADMIN)

        async def override_auth() -> User:
            return user

        app.dependency_overrides[get_current_user] = override_auth

        resp = await client.get(f"/api/v1/agent-templates/{internal_template.id}")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_superadmin_get_by_id_internal_returns_200(
        self, client: AsyncClient, internal_template: AgentTemplate
    ):
        """SUPERADMIN can fetch the internal template by id."""
        resp = await client.get(f"/api/v1/agent-templates/{internal_template.id}")
        assert resp.status_code == 200
        assert resp.json()["name"] == internal_template.name

    @pytest.mark.asyncio
    async def test_non_superadmin_get_public_template_returns_200(
        self, client: AsyncClient, db_session: AsyncSession, seed_test_template: AgentTemplate
    ):
        """ADMIN can still GET a PUBLIC template by id — only internal is hidden."""
        user = await _create_tenant_user(db_session, UserRole.ADMIN)

        async def override_auth() -> User:
            return user

        app.dependency_overrides[get_current_user] = override_auth

        resp = await client.get(f"/api/v1/agent-templates/{seed_test_template.id}")
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_superadmin_from_template_internal_returns_201(
        self, client: AsyncClient, db_session: AsyncSession, internal_template: AgentTemplate
    ):
        """SUPERADMIN can create an agent from the internal template."""
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Internal Co",
            slug=f"internal-co-{uuid.uuid4().hex[:8]}",
            status="active",
            plan="professional",
            timezone="UTC",
            locale="es",
        )
        db_session.add(tenant)
        await db_session.commit()

        resp = await client.post(
            "/api/v1/agents/from-template",
            json={"tenant_id": str(tenant.id), "template_id": str(internal_template.id)},
        )
        assert resp.status_code == 201, resp.text


# ── Seed Shape ───────────────────────────────────────────────────────────────


class TestSeedTemplateShape:
    """SEED_TEMPLATES must be deduplicated: one template per category."""

    def test_seed_has_one_template_per_category(self):
        from collections import Counter

        counts = Counter(t["category"] for t in SEED_TEMPLATES)
        assert all(count == 1 for count in counts.values()), counts

    def test_seed_has_six_templates(self):
        assert len(SEED_TEMPLATES) == 6

    def test_seed_names_are_unique(self):
        names = [t["name"] for t in SEED_TEMPLATES]
        assert len(names) == len(set(names))

    def test_no_plain_variant_duplicates(self):
        """The emoji/plain duplicate pairs must be gone (plain variants removed)."""
        names = [t["name"] for t in SEED_TEMPLATES]
        for plain in ["Restaurante", "Panadería", "Hamburguesería", "Barbería", "Clínica"]:
            assert plain not in names, plain

    def test_all_seed_templates_are_system(self):
        assert all(t.get("is_system") is True for t in SEED_TEMPLATES)

    def test_seed_categories_are_registered(self):
        from app.modules.agents.categories import is_known_category

        for tpl in SEED_TEMPLATES:
            assert is_known_category(tpl["category"]), tpl["category"]

    def test_seed_template_names_keep_emoji_for_ux(self):
        """Decision: emoji lives in the display name, not in the instructions."""
        for tpl in SEED_TEMPLATES:
            assert "{{business_name}}" in tpl["content"]["instructions"]
            # instructions keep the plain wording (no emoji noise for the LLM)
            assert "🍽️" not in tpl["content"]["instructions"]


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


class TestSeedPrune:
    """Prune deletes ONLY stale system templates — custom ones survive."""

    @pytest.mark.asyncio
    async def test_prune_removes_stale_system_templates(
        self, db_session: AsyncSession
    ):
        from app.seed import _prune_system_templates, _seed_templates

        # A stale system template (plain variant, NOT in SEED_TEMPLATES)
        stale = AgentTemplate(
            category="restaurante",
            name="Restaurante",
            description="old duplicate",
            content={"instructions": "old"},
            is_system=True,
        )
        db_session.add(stale)
        await db_session.commit()

        await _seed_templates(db_session)
        await _prune_system_templates(db_session)

        result = await db_session.execute(
            select(AgentTemplate).where(AgentTemplate.name == "Restaurante")
        )
        assert result.scalar_one_or_none() is None

    @pytest.mark.asyncio
    async def test_prune_keeps_custom_templates(self, db_session: AsyncSession):
        from app.seed import _prune_system_templates, _seed_templates

        custom = AgentTemplate(
            category="restaurante",
            name="Mi plantilla personalizada",
            description="client customization",
            content={"instructions": "custom {{business_name}}"},
            is_system=False,
        )
        db_session.add(custom)
        await db_session.commit()

        await _seed_templates(db_session)
        await _prune_system_templates(db_session)

        result = await db_session.execute(
            select(AgentTemplate).where(AgentTemplate.name == "Mi plantilla personalizada")
        )
        assert result.scalar_one_or_none() is not None

    @pytest.mark.asyncio
    async def test_prune_keeps_current_system_templates(
        self, db_session: AsyncSession
    ):
        from app.seed import _prune_system_templates, _seed_templates

        await _seed_templates(db_session)
        await _prune_system_templates(db_session)

        result = await db_session.execute(
            select(AgentTemplate).where(AgentTemplate.is_system.is_(True))
        )
        system = result.scalars().all()
        assert len(system) == len(SEED_TEMPLATES)

    @pytest.mark.asyncio
    async def test_seed_plus_prune_is_idempotent(self, db_session: AsyncSession):
        """seed + prune twice leaves the same system template set."""
        from app.seed import _prune_system_templates, _seed_templates

        # stale leftovers from the old seed (5 plain variants)
        for category, name in [
            ("restaurante", "Restaurante"),
            ("panaderia", "Panadería"),
            ("hamburgueseria", "Hamburguesería"),
            ("barberia", "Barbería"),
            ("clinica", "Clínica"),
        ]:
            db_session.add(
                AgentTemplate(
                    category=category,
                    name=name,
                    content={"instructions": "old"},
                    is_system=True,
                )
            )
        await db_session.commit()

        async def run_flow() -> list[str]:
            await _seed_templates(db_session)
            await _prune_system_templates(db_session)
            result = await db_session.execute(select(AgentTemplate))
            return sorted(t.name for t in result.scalars().all())

        first = await run_flow()
        second = await run_flow()

        assert first == second
        # Exactly the canonical templates remain (stale variants gone)
        assert len(first) == len(SEED_TEMPLATES)
        assert "Restaurante" not in first

    @pytest.mark.asyncio
    async def test_seed_does_not_update_custom_template_with_same_key(
        self, db_session: AsyncSession
    ):
        from app.seed import _seed_templates

        seed_template = SEED_TEMPLATES[0]
        custom = AgentTemplate(
            category=seed_template["category"],
            name=seed_template["name"],
            description="custom description",
            content={"instructions": "custom content"},
            is_system=False,
        )
        db_session.add(custom)
        await db_session.commit()

        await _seed_templates(db_session)

        result = await db_session.execute(
            select(AgentTemplate).where(
                AgentTemplate.category == seed_template["category"],
                AgentTemplate.name == seed_template["name"],
            )
        )
        templates = result.scalars().all()
        custom_rows = [template for template in templates if not template.is_system]
        assert len(custom_rows) == 1
        assert custom_rows[0].description == "custom description"
        assert custom_rows[0].content == {"instructions": "custom content"}

    @pytest.mark.asyncio
    async def test_reset_system_templates_keeps_custom_templates(
        self, db_session: AsyncSession
    ):
        from app.seed import _reset_system_templates, _seed_templates

        custom = AgentTemplate(
            category="restaurante",
            name="Mi plantilla personalizada",
            content={"instructions": "custom"},
            is_system=False,
        )
        db_session.add(custom)
        await db_session.commit()

        await _seed_templates(db_session)
        await _reset_system_templates(db_session)
        await db_session.commit()

        result = await db_session.execute(select(AgentTemplate))
        templates = result.scalars().all()
        assert [template.name for template in templates] == [
            "Mi plantilla personalizada"
        ]
