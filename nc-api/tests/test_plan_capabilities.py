"""Plan capability enforcement tests — permissions, plan gates, tenant isolation.

Covers:
- capability matrix unit tests (pure, no DB)
- admin on basic plan is blocked from creating agents/connections via API
- admin on professional plan can create agents
- superadmin is exempt from plan gates (platform operator)
- /auth/me exposes effective capabilities
- assign-tenant cannot grant superadmin (escalation guard)
- PATCH /tenants cannot mutate a tenant the user is not on (isolation)
"""

from __future__ import annotations

import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User, UserRole
from app.modules.plans.capabilities import (
    CAP_AGENTS_MANAGE,
    CAP_AI,
    CAP_BUSINESS_EDIT,
    CAP_BUSINESS_VIEW,
    CAP_CONNECTIONS_MANAGE,
    CAP_CONVERSATIONS_VIEW,
    CAP_DASHBOARD_VIEW,
    PLAN_CAPABILITIES,
    effective_capabilities,
    get_plan_capabilities,
    plan_has_capability,
)
from app.modules.tenants.models import Tenant


def _create_tenant(
    db_session: AsyncSession, name: str, slug: str, plan: str = "basic"
) -> Tenant:
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


@pytest_asyncio.fixture
async def user(db_session: AsyncSession) -> User:
    user = User(
        id=uuid.uuid4(),
        email="plan-user@test.com",
        password_hash="hash",
        name="Plan User",
    )
    db_session.add(user)
    await db_session.flush()
    return user


def _act_as(user: User, role: UserRole, tenant_id: uuid.UUID | None) -> None:
    """Set JWT-like context on the user and wire the auth override."""
    setattr(user, "current_role", role)
    setattr(user, "current_tenant_id", tenant_id)

    async def mock_get_current_user() -> User:
        return user

    app.dependency_overrides[get_current_user] = mock_get_current_user


# ═══════════════════════════════════════════════════════════════════════════
# Capability matrix (pure unit tests)
# ═══════════════════════════════════════════════════════════════════════════


class TestCapabilityMatrix:
    def test_all_plans_can_view_dashboard(self) -> None:
        for plan in PLAN_CAPABILITIES:
            assert plan_has_capability(plan, CAP_DASHBOARD_VIEW)

    def test_basic_and_trial_lack_ai_and_management(self) -> None:
        for plan in ("basic", "trial"):
            assert not plan_has_capability(plan, CAP_AI)
            assert not plan_has_capability(plan, CAP_AGENTS_MANAGE)
            assert not plan_has_capability(plan, CAP_CONNECTIONS_MANAGE)

    def test_professional_has_ai_and_business_edit(self) -> None:
        """Professional configures its own AI agent — business.edit included."""
        assert plan_has_capability("professional", CAP_AI)
        assert plan_has_capability("professional", CAP_AGENTS_MANAGE)
        assert plan_has_capability("professional", CAP_BUSINESS_EDIT)

    def test_enterprise_has_everything(self) -> None:
        caps = get_plan_capabilities("enterprise")
        assert CAP_BUSINESS_EDIT in caps
        assert CAP_AGENTS_MANAGE in caps

    def test_unknown_plan_falls_back_to_basic(self) -> None:
        assert get_plan_capabilities("mystery-plan") == get_plan_capabilities("basic")

    def test_superadmin_gets_union_of_all_capabilities(self) -> None:
        caps = effective_capabilities(UserRole.SUPERADMIN, "basic")
        assert CAP_AGENTS_MANAGE in caps
        assert CAP_BUSINESS_EDIT in caps

    def test_client_is_view_only_on_any_plan(self) -> None:
        """UR-7: client gets {dashboard.view, conversations.view, business.view} on ANY plan."""
        for plan in PLAN_CAPABILITIES:
            caps = effective_capabilities(UserRole.CLIENT, plan)
            assert caps == frozenset(
                {CAP_DASHBOARD_VIEW, CAP_CONVERSATIONS_VIEW, CAP_BUSINESS_VIEW}
            )
            assert CAP_BUSINESS_EDIT not in caps
            assert CAP_AGENTS_MANAGE not in caps
            assert CAP_CONNECTIONS_MANAGE not in caps

    def test_enterprise_client_stays_view_only(self) -> None:
        """UR-7 scenario: enterprise client excludes edit/manage caps."""
        caps = effective_capabilities(UserRole.CLIENT, "enterprise")
        assert caps == frozenset(
            {CAP_DASHBOARD_VIEW, CAP_CONVERSATIONS_VIEW, CAP_BUSINESS_VIEW}
        )
        assert not ({CAP_BUSINESS_EDIT, CAP_AGENTS_MANAGE, CAP_CONNECTIONS_MANAGE} & caps)

    def test_unknown_role_degrades_to_view_only(self) -> None:
        """Design: stale/unknown roles degrade to the client view-only set."""
        caps = effective_capabilities("stale-role", "enterprise")
        assert caps == frozenset(
            {CAP_DASHBOARD_VIEW, CAP_CONVERSATIONS_VIEW, CAP_BUSINESS_VIEW}
        )

    def test_admin_keeps_plan_gated_capabilities(self) -> None:
        """Admin capability derivation is plan-based, unchanged by the rework."""
        basic_caps = effective_capabilities(UserRole.ADMIN, "basic")
        assert basic_caps == get_plan_capabilities("basic")
        assert CAP_BUSINESS_EDIT not in basic_caps
        pro_caps = effective_capabilities(UserRole.ADMIN, "professional")
        assert CAP_BUSINESS_EDIT in pro_caps
        assert CAP_AGENTS_MANAGE in pro_caps


# ═══════════════════════════════════════════════════════════════════════════
# Plan gates on agent/connection creation
# ═══════════════════════════════════════════════════════════════════════════


class TestPlanGates:
    @pytest.mark.asyncio
    async def test_admin_on_basic_cannot_create_agent(
        self, client: AsyncClient, db_session: AsyncSession, user: User
    ) -> None:
        """A client/basic user cannot create agents via API — plan gate."""
        tenant = _create_tenant(db_session, "Basic Co", "basic-co", plan="basic")
        await db_session.commit()
        _act_as(user, UserRole.ADMIN, tenant.id)
        try:
            response = await client.post(
                "/api/v1/agents",
                json={"name": "Agent X", "tenant_id": str(tenant.id)},
            )
            assert response.status_code == 403
            assert "plan" in response.json()["detail"].lower()
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_admin_on_basic_cannot_create_connection(
        self, client: AsyncClient, db_session: AsyncSession, user: User
    ) -> None:
        """A client/basic user cannot create platform connections via API."""
        tenant = _create_tenant(db_session, "Basic Co", "basic-co-2", plan="basic")
        await db_session.commit()
        _act_as(user, UserRole.ADMIN, tenant.id)
        try:
            response = await client.post(
                "/api/v1/platform-connections",
                json={
                    "tenant_id": str(tenant.id),
                    "platform_type": "whatsapp",
                    "display_name": "Test",
                    "credentials": {"token": "x"},
                },
            )
            assert response.status_code == 403
            assert "plan" in response.json()["detail"].lower()
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_admin_on_professional_can_create_agent(
        self, client: AsyncClient, db_session: AsyncSession, user: User
    ) -> None:
        """Admin on an AI-capable plan can create agents."""
        tenant = _create_tenant(db_session, "Pro Co", "pro-co", plan="professional")
        await db_session.commit()
        _act_as(user, UserRole.ADMIN, tenant.id)
        try:
            response = await client.post(
                "/api/v1/agents",
                json={"name": "Agent X", "tenant_id": str(tenant.id)},
            )
            assert response.status_code == 201, response.text
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_superadmin_exempt_from_plan_gate(
        self, client: AsyncClient, db_session: AsyncSession, user: User
    ) -> None:
        """Superadmin provisions agents for ANY plan (operator exemption)."""
        tenant = _create_tenant(db_session, "Basic Co", "basic-co-3", plan="basic")
        await db_session.commit()
        _act_as(user, UserRole.SUPERADMIN, tenant.id)
        try:
            response = await client.post(
                "/api/v1/agents",
                json={"name": "Agent X", "tenant_id": str(tenant.id)},
            )
            assert response.status_code == 201, response.text
        finally:
            app.dependency_overrides.clear()


# ═══════════════════════════════════════════════════════════════════════════
# /auth/me effective capabilities
# ═══════════════════════════════════════════════════════════════════════════


class TestMeCapabilities:
    @pytest.mark.asyncio
    async def test_me_returns_capabilities_for_basic_plan(
        self, client: AsyncClient, db_session: AsyncSession, user: User
    ) -> None:
        tenant = _create_tenant(db_session, "Basic Me", "basic-me", plan="basic")
        await db_session.commit()
        user.role = UserRole.CLIENT
        _act_as(user, UserRole.CLIENT, tenant.id)
        try:
            response = await client.get("/api/v1/auth/me")
            assert response.status_code == 200
            caps = response.json()["capabilities"]
            assert CAP_DASHBOARD_VIEW in caps
            assert CAP_AGENTS_MANAGE not in caps
            assert CAP_AI not in caps
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_me_returns_view_only_for_client_on_enterprise_plan(
        self, client: AsyncClient, db_session: AsyncSession, user: User
    ) -> None:
        """RV-3: /auth/me for a client on enterprise reports ONLY view caps.

        Regression for the core fix #2: business.edit used to be plan-gated
        only, so a professional/enterprise CLIENT saw edit caps in /auth/me.
        """
        tenant = _create_tenant(db_session, "Ent Me", "ent-me", plan="enterprise")
        await db_session.commit()
        user.role = UserRole.CLIENT
        _act_as(user, UserRole.CLIENT, tenant.id)
        try:
            response = await client.get("/api/v1/auth/me")
            assert response.status_code == 200
            caps = response.json()["capabilities"]
            assert set(caps) == {
                "dashboard.view",
                "conversations.view",
                "business.view",
            }
            assert CAP_BUSINESS_EDIT not in caps
            assert CAP_AGENTS_MANAGE not in caps
            assert CAP_CONNECTIONS_MANAGE not in caps
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_me_returns_view_only_for_client_on_professional_plan(
        self, client: AsyncClient, db_session: AsyncSession, user: User
    ) -> None:
        """RV-3: /auth/me for a client on professional reports ONLY view caps."""
        tenant = _create_tenant(db_session, "Pro Me", "pro-me", plan="professional")
        await db_session.commit()
        user.role = UserRole.CLIENT
        _act_as(user, UserRole.CLIENT, tenant.id)
        try:
            response = await client.get("/api/v1/auth/me")
            assert response.status_code == 200
            caps = response.json()["capabilities"]
            assert set(caps) == {
                "dashboard.view",
                "conversations.view",
                "business.view",
            }
            assert CAP_BUSINESS_EDIT not in caps
            assert CAP_AGENTS_MANAGE not in caps
            assert CAP_AI not in caps
        finally:
            app.dependency_overrides.clear()


# ═══════════════════════════════════════════════════════════════════════════
# Self-upgrade guard — plan/status tampering on tenants
# ═══════════════════════════════════════════════════════════════════════════


class TestSelfUpgradeGuard:
    @pytest.mark.asyncio
    async def test_tenantless_user_cannot_self_assign_enterprise(
        self, client: AsyncClient, db_session: AsyncSession, user: User
    ) -> None:
        """Self-service tenant creation is forced to the basic plan."""
        _act_as(user, UserRole.CLIENT, None)
        try:
            response = await client.post(
                "/api/v1/tenants",
                json={"name": "New Co", "slug": "new-co", "plan": "enterprise"},
            )
            assert response.status_code == 201, response.text
            assert response.json()["plan"] == "basic"
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_create_tenant_rejects_invalid_plan(
        self, client: AsyncClient, db_session: AsyncSession, user: User
    ) -> None:
        """Creating a tenant with an unknown plan returns 422."""
        _act_as(user, UserRole.SUPERADMIN, None)
        try:
            response = await client.post(
                "/api/v1/tenants",
                json={"name": "New Co", "slug": "new-co-2", "plan": "hacked"},
            )
            assert response.status_code == 422
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_admin_cannot_self_upgrade_plan(
        self, client: AsyncClient, db_session: AsyncSession, user: User
    ) -> None:
        """An admin cannot switch their tenant to enterprise via PATCH."""
        tenant = _create_tenant(db_session, "Basic Co", "upgrade-guard", plan="basic")
        await db_session.commit()
        _act_as(user, UserRole.ADMIN, tenant.id)
        try:
            response = await client.patch(
                f"/api/v1/tenants/{tenant.id}", json={"plan": "enterprise"}
            )
            assert response.status_code == 200
            assert response.json()["plan"] == "basic"  # unchanged — dropped server-side
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_admin_cannot_change_status(
        self, client: AsyncClient, db_session: AsyncSession, user: User
    ) -> None:
        """An admin cannot suspend/activate their tenant via PATCH."""
        tenant = _create_tenant(db_session, "Active Co", "status-guard")
        await db_session.commit()
        _act_as(user, UserRole.ADMIN, tenant.id)
        try:
            response = await client.patch(
                f"/api/v1/tenants/{tenant.id}", json={"status": "suspended"}
            )
            assert response.status_code == 200
            assert response.json()["status"] == "active"  # unchanged
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_superadmin_can_change_plan(
        self, client: AsyncClient, db_session: AsyncSession, user: User
    ) -> None:
        """Superadmin can still upgrade a tenant's plan (authorized flow)."""
        tenant = _create_tenant(db_session, "Upgrade Co", "super-upgrade")
        await db_session.commit()
        _act_as(user, UserRole.SUPERADMIN, tenant.id)
        try:
            response = await client.patch(
                f"/api/v1/tenants/{tenant.id}", json={"plan": "enterprise"}
            )
            assert response.status_code == 200, response.text
            assert response.json()["plan"] == "enterprise"
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_update_tenant_rejects_invalid_plan(
        self, client: AsyncClient, db_session: AsyncSession, user: User
    ) -> None:
        """PATCH with an unknown plan value returns 422."""
        tenant = _create_tenant(db_session, "Invalid Co", "invalid-plan")
        await db_session.commit()
        _act_as(user, UserRole.SUPERADMIN, tenant.id)
        try:
            response = await client.patch(
                f"/api/v1/tenants/{tenant.id}", json={"plan": "garbage"}
            )
            assert response.status_code == 422
        finally:
            app.dependency_overrides.clear()


# ═══════════════════════════════════════════════════════════════════════════
# Escalation guard + tenant isolation
# ═══════════════════════════════════════════════════════════════════════════


class TestEscalationAndIsolation:
    @pytest.mark.asyncio
    async def test_assign_tenant_cannot_grant_superadmin(
        self, client: AsyncClient, db_session: AsyncSession, user: User
    ) -> None:
        """assign-tenant rejects role=superadmin (privilege escalation guard)."""
        tenant = _create_tenant(db_session, "Assign Co", "assign-co")
        target = User(
            id=uuid.uuid4(), email="target@test.com", name="Target", password_hash="hash"
        )
        db_session.add(target)
        await db_session.commit()
        _act_as(user, UserRole.ADMIN, tenant.id)
        try:
            response = await client.post(
                "/api/v1/admin/assign-tenant",
                json={
                    "user_id": str(target.id),
                    "tenant_id": str(tenant.id),
                    "role": "superadmin",
                },
            )
            assert response.status_code == 422
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_admin_cannot_assign_cross_tenant(
        self, client: AsyncClient, db_session: AsyncSession, user: User
    ) -> None:
        """An admin can only assign users to their ACTIVE tenant."""
        own = _create_tenant(db_session, "Own Assign", "own-assign")
        other = _create_tenant(db_session, "Other Assign", "other-assign")
        target = User(
            id=uuid.uuid4(), email="target2@test.com", name="Target", password_hash="hash"
        )
        db_session.add(target)
        await db_session.commit()
        _act_as(user, UserRole.ADMIN, own.id)
        try:
            response = await client.post(
                "/api/v1/admin/assign-tenant",
                json={
                    "user_id": str(target.id),
                    "tenant_id": str(other.id),
                    "role": "client",
                },
            )
            assert response.status_code == 403
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_admin_can_assign_to_own_active_tenant(
        self, client: AsyncClient, db_session: AsyncSession, user: User
    ) -> None:
        """An admin CAN assign users to their own active tenant."""
        own = _create_tenant(db_session, "Own Assign 2", "own-assign-2")
        target = User(
            id=uuid.uuid4(), email="target3@test.com", name="Target", password_hash="hash"
        )
        db_session.add(target)
        await db_session.commit()
        _act_as(user, UserRole.ADMIN, own.id)
        try:
            response = await client.post(
                "/api/v1/admin/assign-tenant",
                json={
                    "user_id": str(target.id),
                    "tenant_id": str(own.id),
                    "role": "client",
                },
            )
            assert response.status_code == 200, response.text
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_admin_cannot_assign_admin_role(
        self, client: AsyncClient, db_session: AsyncSession, user: User
    ) -> None:
        """A non-superadmin admin cannot grant the privileged admin role."""
        own = _create_tenant(db_session, "Own Assign", "own-admin-role")
        target = User(
            id=uuid.uuid4(), email="target-admin@test.com", name="Target", password_hash="hash"
        )
        db_session.add(target)
        await db_session.commit()
        _act_as(user, UserRole.ADMIN, own.id)
        try:
            response = await client.post(
                "/api/v1/admin/assign-tenant",
                json={
                    "user_id": str(target.id),
                    "tenant_id": str(own.id),
                    "role": "admin",
                },
            )
            assert response.status_code == 403
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_admin_cannot_modify_superadmin_user_assignment(
        self, client: AsyncClient, db_session: AsyncSession, user: User
    ) -> None:
        """A non-superadmin admin cannot touch a superadmin user's assignment."""
        own = _create_tenant(db_session, "Own Assign", "own-super-target")
        target = User(
            id=uuid.uuid4(),
            email="super-target@test.com",
            name="Super Target",
            password_hash="hash",
            role=UserRole.SUPERADMIN,
        )
        db_session.add(target)
        await db_session.commit()
        _act_as(user, UserRole.ADMIN, own.id)
        try:
            response = await client.post(
                "/api/v1/admin/assign-tenant",
                json={
                    "user_id": str(target.id),
                    "tenant_id": str(own.id),
                    "role": "client",
                },
            )
            assert response.status_code == 403
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_superadmin_can_assign_admin_role(
        self, client: AsyncClient, db_session: AsyncSession, user: User
    ) -> None:
        """Superadmin CAN assign the admin role (operator flow)."""
        own = _create_tenant(db_session, "Super Assign", "super-admin-role")
        target = User(
            id=uuid.uuid4(), email="target-super@test.com", name="Target", password_hash="hash"
        )
        db_session.add(target)
        await db_session.commit()
        _act_as(user, UserRole.SUPERADMIN, own.id)
        try:
            response = await client.post(
                "/api/v1/admin/assign-tenant",
                json={
                    "user_id": str(target.id),
                    "tenant_id": str(own.id),
                    "role": "admin",
                },
            )
            assert response.status_code == 200, response.text
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_admin_cannot_patch_tenant_outside_active_tenant(
        self, client: AsyncClient, db_session: AsyncSession, user: User
    ) -> None:
        """PATCH /tenants/{id} is isolated to the user's active tenant."""
        own = _create_tenant(db_session, "Own Co", "own-co")
        other = _create_tenant(db_session, "Other Co", "other-co")
        await db_session.commit()
        _act_as(user, UserRole.ADMIN, own.id)
        try:
            response = await client.patch(
                f"/api/v1/tenants/{other.id}", json={"name": "Hacked"}
            )
            assert response.status_code == 403
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_admin_can_patch_own_active_tenant(
        self, client: AsyncClient, db_session: AsyncSession, user: User
    ) -> None:
        """PATCH /tenants/{id} still works for the user's own active tenant."""
        own = _create_tenant(db_session, "Own Co", "own-co-2")
        await db_session.commit()
        _act_as(user, UserRole.ADMIN, own.id)
        try:
            response = await client.patch(
                f"/api/v1/tenants/{own.id}", json={"name": "Renamed"}
            )
            assert response.status_code == 200, response.text
            assert response.json()["name"] == "Renamed"
        finally:
            app.dependency_overrides.clear()
