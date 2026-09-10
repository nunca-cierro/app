"""Plan usage schemas — contract for GET /plans/usage (plan-differentiation).

Consumed by the usage endpoint (Phase 2) and mirrored by the dashboard widget.
``pct`` = percentage of AI responses used against ``max_conversations_per_month``
(primary metric, design D1); ``None`` when the plan is unlimited (enterprise).
``over_limit`` = True when ANY usage metric exceeds its limit (soft — the
endpoint never blocks or bills on it).

Values are informative/consumable only; this module performs no enforcement.
"""

from __future__ import annotations

from pydantic import BaseModel


class PlanLimits(BaseModel):
    """Limit map for a plan — mirrors ``PLAN_LIMITS`` (None = unlimited)."""

    max_agents: int | None
    max_products: int | None
    max_conversations_per_month: int | None
    max_businesses: int | None


class PlanUsage(BaseModel):
    """Measured consumption for the tenant (current month, active tenant)."""

    ai_responses: int = 0
    products: int = 0
    businesses: int = 0


class PlanUsageResponse(BaseModel):
    """Full /plans/usage payload — plan + limits + usage + derived flags."""

    plan: str
    limits: PlanLimits
    usage: PlanUsage
    pct: int | None
    over_limit: bool