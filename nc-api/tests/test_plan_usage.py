"""Plan usage schemas — foundation tests (plan-differentiation, Slice 1).

Covers the ``plans/schemas.py`` contract consumed by ``GET /plans/usage``:

    { "plan": ..., "limits": {…}, "usage": {…}, "pct": …, "over_limit": … }

``get_plan_limits()`` output must be directly consumable by ``PlanLimits``
(the "live/consumable helper" wiring). Endpoint-level scenarios (happy path,
over-limit soft, isolation, 401) land with the endpoint in Phase 2 — this
file only locks the data contract both sides serialize to.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User, UserRole
from app.modules.auth.user_tenant import UserTenant
from app.modules.plans.capabilities import get_plan_limits
from app.modules.plans.schemas import PlanLimits, PlanUsage, PlanUsageResponse
from app.modules.tenants.models import Tenant


class TestPlanLimitsSchema:
    def test_builds_from_get_plan_limits_professional(self) -> None:
        """get_plan_limits() output is directly consumable by PlanLimits."""
        limits = PlanLimits(**get_plan_limits("professional"))
        assert limits.max_agents == 10
        assert limits.max_products == 200
        assert limits.max_conversations_per_month == 10000
        assert limits.max_businesses == 5

    def test_builds_from_get_plan_limits_enterprise(self) -> None:
        """Enterprise → AI cap 100.000/mes; agents/products/businesses stay unlimited."""
        limits = PlanLimits(**get_plan_limits("enterprise"))
        assert limits.max_conversations_per_month == 100000
        assert limits.max_agents is None
        assert limits.max_products is None
        assert limits.max_businesses is None

    def test_serializes_to_contract_keys(self) -> None:
        """PlanLimits JSON keys match the documented limits contract."""
        limits = PlanLimits(**get_plan_limits("basic"))
        assert limits.model_dump() == {
            "max_agents": 1,
            "max_products": 50,
            "max_conversations_per_month": 2000,
            "max_businesses": 1,
        }


class TestPlanUsageSchema:
    def test_roundtrips_usage_counts(self) -> None:
        usage = PlanUsage(ai_responses=1200, products=12, businesses=2)
        assert usage.model_dump() == {
            "ai_responses": 1200,
            "products": 12,
            "businesses": 2,
        }


class TestPlanUsageResponseSchema:
    def test_happy_path_contract(self) -> None:
        """Scenario HappyPathUsage shape: plan + limits + usage + pct + over_limit."""
        response = PlanUsageResponse(
            plan="professional",
            limits=PlanLimits(**get_plan_limits("professional")),
            usage=PlanUsage(ai_responses=1200, products=12, businesses=2),
            pct=24,
            over_limit=False,
        )
        assert response.model_dump() == {
            "plan": "professional",
            "limits": {
                "max_agents": 10,
                "max_products": 200,
                "max_conversations_per_month": 10000,
                "max_businesses": 5,
            },
            "usage": {"ai_responses": 1200, "products": 12, "businesses": 2},
            "pct": 24,
            "over_limit": False,
        }

    def test_over_limit_soft_contract(self) -> None:
        """Scenario OverLimitSoft: pct>100 serializes without enforcement."""
        response = PlanUsageResponse(
            plan="basic",
            limits=PlanLimits(**get_plan_limits("basic")),
            usage=PlanUsage(ai_responses=5100, products=1, businesses=1),
            pct=102,
            over_limit=True,
        )
        assert response.pct == 102
        assert response.over_limit is True

    def test_enterprise_pct_numeric(self) -> None:
        """Enterprise → numeric pct vs the 100.000 cap (10), over_limit False."""
        response = PlanUsageResponse(
            plan="enterprise",
            limits=PlanLimits(**get_plan_limits("enterprise")),
            usage=PlanUsage(ai_responses=9999, products=999, businesses=9),
            pct=10,  # round(9999 * 100 / 100000)
            over_limit=False,
        )
        assert response.pct == 10
        assert response.over_limit is False


# ── Phase 2: GET /api/v1/plans/usage endpoint ─────────────────────────────────
# Design D1/D3: per-tenant meter scoped by the JWT (current_tenant_id); pct = %
# of AI responses vs max_conversations_per_month (PRIMARY metric); over_limit =
# True when ANY usage metric exceeds its limit; enterprise → pct null. Soft
# limits — the endpoint only reports, never blocks or bills.


class TestUsageDerivedMetrics:
    """Pure helpers of the endpoint module (design D1: pct/over_limit/month)."""

    def test_pct_is_percent_of_primary_metric(self) -> None:
        from app.api.v1.plans import compute_pct

        assert compute_pct(1200, 5000) == 24
        assert compute_pct(5100, 5000) == 102
        assert compute_pct(0, 500) == 0

    def test_pct_none_when_limit_unlimited(self) -> None:
        from app.api.v1.plans import compute_pct

        assert compute_pct(9999, None) is None

    def test_over_limit_true_when_any_metric_exceeds(self) -> None:
        from app.api.v1.plans import compute_over_limit

        limits = PlanLimits(**get_plan_limits("professional"))
        # Each metric independently triggers over_limit when above its limit
        # (generous 2026-09 limits: 10/200/10000/5).
        assert (
            compute_over_limit(
                PlanUsage(ai_responses=15000, products=1, businesses=1), limits
            )
            is True
        )
        assert (
            compute_over_limit(
                PlanUsage(ai_responses=100, products=250, businesses=1), limits
            )
            is True
        )
        assert (
            compute_over_limit(
                PlanUsage(ai_responses=100, products=1, businesses=6), limits
            )
            is True
        )
        # At the limit exactly → NOT over.
        assert (
            compute_over_limit(
                PlanUsage(ai_responses=10000, products=200, businesses=5), limits
            )
            is False
        )

    def test_over_limit_false_when_limits_unlimited(self) -> None:
        from app.api.v1.plans import compute_over_limit

        limits = PlanLimits(**get_plan_limits("enterprise"))
        assert (
            compute_over_limit(
                PlanUsage(ai_responses=9999, products=999, businesses=9), limits
            )
            is False
        )

    def test_month_start_is_first_instant_of_utc_month(self) -> None:
        from app.api.v1.plans import current_month_start

        now = datetime(2026, 9, 10, 15, 30, 45, tzinfo=UTC)
        assert current_month_start(now) == datetime(2026, 9, 1, 0, 0, 0, tzinfo=UTC)


async def _seed_usage_tenant(
    db_session: AsyncSession,
    *,
    plan: str,
    slug: str,
    ai_messages: int = 0,
    products: int = 0,
    programmed: int = 0,
    escalation: int = 0,
    last_month_ai: int = 0,
) -> Tenant:
    """Tenant + conversation + outbound messages (+ optional agent/products)."""
    from app.modules.agents.models import AiAgent
    from app.modules.conversations.models import Conversation, Message

    tenant = Tenant(
        id=uuid.uuid4(), name="Usage Co", slug=slug, status="active",
        plan=plan, timezone="UTC", locale="es",
    )
    db_session.add(tenant)
    await db_session.flush()

    conv = Conversation(
        tenant_id=tenant.id, external_user_id="573001234567", status="open",
    )
    db_session.add(conv)
    await db_session.flush()

    now = datetime.now(UTC)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    def _msg(origin: str | None, content: str, created_at: datetime | None = None) -> Message:
        return Message(
            tenant_id=tenant.id, conversation_id=conv.id, direction="out",
            origin=origin, content=content, status="sent",
            created_at=created_at or now,
        )

    rows = (
        [_msg("ai", f"ai-{i}") for i in range(ai_messages)]
        + [_msg("programmed", f"prog-{i}") for i in range(programmed)]
        + [_msg("escalation", f"esc-{i}") for i in range(escalation)]
        + [
            _msg("ai", f"old-{i}", created_at=month_start - timedelta(days=1))
            for i in range(last_month_ai)
        ]
    )
    db_session.add_all(rows)

    if products:
        db_session.add(
            AiAgent(
                tenant_id=tenant.id, name="Agent", enabled=True,
                business_config={
                    "products_services": [{"name": f"P{i}"} for i in range(products)]
                },
            )
        )
    await db_session.commit()
    return tenant


def _auth_as(db_session: AsyncSession, *, tenant_id: uuid.UUID | None) -> User:
    """Register a user override with the given JWT-scoped tenant context."""
    user = User(
        id=uuid.uuid4(), email="usage@test.com", name="Usage User",
        password_hash="hash",
    )
    db_session.add(user)
    setattr(user, "current_role", UserRole.ADMIN)
    setattr(user, "current_tenant_id", tenant_id)

    async def mock_get_current_user() -> User:
        return user

    app.dependency_overrides[get_current_user] = mock_get_current_user
    return user


class TestPlanUsageEndpoint:
    @pytest.mark.asyncio
    async def test_happy_path_professional(
        self, client: AsyncClient, db_session: AsyncSession,
    ) -> None:
        """HappyPathUsage: 1200 AI responses + 12 products → pct=24, not over."""
        tenant = await _seed_usage_tenant(
            db_session, plan="professional", slug="happy-pro",
            ai_messages=1200, products=12, last_month_ai=1,
        )
        user = _auth_as(db_session, tenant_id=tenant.id)
        # businesses = the user's memberships (design D1: COUNT UserTenant).
        db_session.add(UserTenant(user_id=user.id, tenant_id=tenant.id, role=UserRole.ADMIN, is_primary=True))
        await db_session.commit()

        response = await client.get("/api/v1/plans/usage")

        assert response.status_code == 200, response.text
        data = response.json()
        assert data == {
            "plan": "professional",
            "limits": {
                "max_agents": 10,
                "max_products": 200,
                "max_conversations_per_month": 10000,
                "max_businesses": 5,
            },
            "usage": {"ai_responses": 1200, "products": 12, "businesses": 1},
            "pct": 12,  # round(1200 * 100 / 10000)
            "over_limit": False,
        }

    @pytest.mark.asyncio
    async def test_over_limit_soft_returns_200(
        self, client: AsyncClient, db_session: AsyncSession,
    ) -> None:
        """OverLimitSoft: 10200/10000 → 200 with pct=102, over_limit=true."""
        tenant = await _seed_usage_tenant(
            db_session, plan="professional", slug="over-pro", ai_messages=10200,
        )
        _auth_as(db_session, tenant_id=tenant.id)
        await db_session.commit()

        response = await client.get("/api/v1/plans/usage")

        assert response.status_code == 200, response.text
        data = response.json()
        assert data["usage"]["ai_responses"] == 10200
        assert data["limits"]["max_conversations_per_month"] == 10000
        assert data["pct"] == 102
        assert data["over_limit"] is True

    @pytest.mark.asyncio
    async def test_non_ai_outbounds_not_counted(
        self, client: AsyncClient, db_session: AsyncSession,
    ) -> None:
        """NonAiNotCounted: programmed/escalation never increment ai_responses."""
        tenant = await _seed_usage_tenant(
            db_session, plan="basic", slug="non-ai",
            ai_messages=3, programmed=10, escalation=5,
        )
        _auth_as(db_session, tenant_id=tenant.id)
        await db_session.commit()

        response = await client.get("/api/v1/plans/usage")

        assert response.status_code == 200, response.text
        data = response.json()
        assert data["usage"]["ai_responses"] == 3
        # basic has a 2000/mo AI cap → pct = round(3 * 100 / 2000) = 0.
        assert data["pct"] == 0

    @pytest.mark.asyncio
    async def test_tenant_isolation_active_tenant_only(
        self, client: AsyncClient, db_session: AsyncSession,
    ) -> None:
        """TenantIsolation: data of tenant B never leaks into tenant A's meter."""
        tenant_a = await _seed_usage_tenant(
            db_session, plan="professional", slug="iso-a",
            ai_messages=300, products=5,
        )
        tenant_b = await _seed_usage_tenant(
            db_session, plan="professional", slug="iso-b",
            ai_messages=700, products=20,
        )
        user = _auth_as(db_session, tenant_id=tenant_a.id)
        db_session.add(UserTenant(user_id=user.id, tenant_id=tenant_a.id, role=UserRole.ADMIN, is_primary=True))
        db_session.add(UserTenant(user_id=user.id, tenant_id=tenant_b.id, role=UserRole.CLIENT, is_primary=False))
        await db_session.commit()

        response = await client.get("/api/v1/plans/usage")

        assert response.status_code == 200, response.text
        data = response.json()
        # Only tenant A's counters (B has 700 AI responses + 20 products).
        assert data["usage"]["ai_responses"] == 300
        assert data["usage"]["products"] == 5
        # businesses counts the user's memberships (A + B), per design D1.
        assert data["usage"]["businesses"] == 2
        assert data["pct"] == 3  # round(300 * 100 / 10000)

    @pytest.mark.asyncio
    async def test_unknown_plan_falls_back_to_basic_limits(
        self, client: AsyncClient, db_session: AsyncSession,
    ) -> None:
        """UnknownPlanFallsBackToBasic: limits = basic; pct vs 2000."""
        tenant = await _seed_usage_tenant(
            db_session, plan="legacy-plan", slug="legacy",
            ai_messages=100, products=2,
        )
        _auth_as(db_session, tenant_id=tenant.id)
        await db_session.commit()

        response = await client.get("/api/v1/plans/usage")

        assert response.status_code == 200, response.text
        data = response.json()
        assert data["plan"] == "legacy-plan"
        assert data["limits"] == {
            "max_agents": 1,
            "max_products": 50,
            "max_conversations_per_month": 2000,
            "max_businesses": 1,
        }
        # basic has a 2000/mo AI cap → pct = round(100 * 100 / 2000) = 5.
        assert data["pct"] == 5
        assert data["over_limit"] is False

    @pytest.mark.asyncio
    async def test_enterprise_usage_reports_numeric_cap(
        self, client: AsyncClient, db_session: AsyncSession,
    ) -> None:
        """EnterpriseUsageReportsNumericCap: limit 100000, numeric pct 0, never over."""
        tenant = await _seed_usage_tenant(
            db_session, plan="enterprise", slug="enterprise-co",
            ai_messages=60, products=25,  # 25 products with None limit → never over
        )
        _auth_as(db_session, tenant_id=tenant.id)
        await db_session.commit()

        response = await client.get("/api/v1/plans/usage")

        assert response.status_code == 200, response.text
        data = response.json()
        assert data["limits"] == {
            "max_agents": None,
            "max_products": None,
            "max_conversations_per_month": 100000,
            "max_businesses": None,
        }
        assert data["pct"] == 0  # round(60 * 100 / 100000)
        assert data["over_limit"] is False

    @pytest.mark.asyncio
    async def test_downgrade_preserves_data_and_reflects_excess(
        self, client: AsyncClient, db_session: AsyncSession,
    ) -> None:
        """DowngradePreservesData: 3000 AI responses survive a professional→basic
        downgrade; the meter keeps counting them. Básico now has a 2000/mo AI
        cap so the soft excess comes from AI (3000 > 2000) and products (60 > 50)."""
        tenant = await _seed_usage_tenant(
            db_session, plan="professional", slug="downgrade-co",
            ai_messages=3000, products=60,
        )
        _auth_as(db_session, tenant_id=tenant.id)
        await db_session.commit()

        # Downgrade to basic (generous limits: 50 products, 2000 AI responses/mo).
        tenant.plan = "basic"
        await db_session.commit()

        response = await client.get("/api/v1/plans/usage")

        assert response.status_code == 200, response.text
        data = response.json()
        assert data["plan"] == "basic"
        assert data["limits"]["max_conversations_per_month"] == 2000
        assert data["usage"]["ai_responses"] == 3000  # data fully preserved
        assert data["pct"] == 150  # round(3000 * 100 / 2000) — AI soft excess
        assert data["over_limit"] is True  # AI 3000 > 2000 AND products 60 > 50

    @pytest.mark.asyncio
    async def test_unauthenticated_returns_401(
        self, client: AsyncClient, db_session: AsyncSession,
    ) -> None:
        """UnauthenticatedRejected: no valid token → 401."""
        async def deny() -> User:
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

        app.dependency_overrides[get_current_user] = deny
        try:
            response = await client.get("/api/v1/plans/usage")
            assert response.status_code == 401
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_no_active_tenant_returns_404(
        self, client: AsyncClient, db_session: AsyncSession,
    ) -> None:
        """D3: superadmin/user without current_tenant_id → 404 'No active tenant'."""
        # The default client fixture authenticates a superadmin with
        # current_tenant_id=None — exactly the tenantless case.
        response = await client.get("/api/v1/plans/usage")
        assert response.status_code == 404
        assert "No active tenant" in response.json()["detail"]