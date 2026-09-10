"""Plan usage schemas — foundation tests (plan-differentiation, Slice 1).

Covers the ``plans/schemas.py`` contract consumed by ``GET /plans/usage``:

    { "plan": ..., "limits": {…}, "usage": {…}, "pct": …, "over_limit": … }

``get_plan_limits()`` output must be directly consumable by ``PlanLimits``
(the "live/consumable helper" wiring). Endpoint-level scenarios (happy path,
over-limit soft, isolation, 401) land with the endpoint in Phase 2 — this
file only locks the data contract both sides serialize to.
"""

from __future__ import annotations

from app.modules.plans.capabilities import get_plan_limits
from app.modules.plans.schemas import PlanLimits, PlanUsage, PlanUsageResponse


class TestPlanLimitsSchema:
    def test_builds_from_get_plan_limits_professional(self) -> None:
        """get_plan_limits() output is directly consumable by PlanLimits."""
        limits = PlanLimits(**get_plan_limits("professional"))
        assert limits.max_agents == 5
        assert limits.max_products == 50
        assert limits.max_conversations_per_month == 5000
        assert limits.max_businesses == 3

    def test_builds_from_get_plan_limits_enterprise(self) -> None:
        """Enterprise → None values (unlimited)."""
        limits = PlanLimits(**get_plan_limits("enterprise"))
        assert limits.max_agents is None
        assert limits.max_conversations_per_month is None

    def test_serializes_to_contract_keys(self) -> None:
        """PlanLimits JSON keys match the documented limits contract."""
        limits = PlanLimits(**get_plan_limits("basic"))
        assert limits.model_dump() == {
            "max_agents": 1,
            "max_products": 10,
            "max_conversations_per_month": 500,
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
                "max_agents": 5,
                "max_products": 50,
                "max_conversations_per_month": 5000,
                "max_businesses": 3,
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

    def test_enterprise_pct_nullable(self) -> None:
        """Enterprise → pct not applicable (null), over_limit False."""
        response = PlanUsageResponse(
            plan="enterprise",
            limits=PlanLimits(**get_plan_limits("enterprise")),
            usage=PlanUsage(ai_responses=9999, products=999, businesses=9),
            pct=None,
            over_limit=False,
        )
        assert response.pct is None
        assert response.over_limit is False