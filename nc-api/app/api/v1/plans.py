"""Plan usage endpoints — GET /plans/usage (plan-differentiation, Phase 2).

Read-only consumption meter for the ACTIVE tenant (JWT-scoped
``current_tenant_id``, design D3): effective plan limits + current usage +
derived flags. ``pct`` = percentage of AI responses against
``max_conversations_per_month`` (PRIMARY metric, design D1); ``None`` when the
plan is unlimited (enterprise). ``over_limit`` = True when ANY usage metric
exceeds its limit. Soft limits — this module only reports; nothing here
blocks, enforces or bills.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.agents.models import AiAgent
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User
from app.modules.auth.user_tenant import UserTenant
from app.modules.conversations.models import Message
from app.modules.plans.capabilities import get_plan_limits
from app.modules.plans.schemas import PlanLimits, PlanUsage, PlanUsageResponse
from app.modules.tenants.models import Tenant

router = APIRouter(prefix="/plans", tags=["plans"])


def current_month_start(now: datetime | None = None) -> datetime:
    """First instant of the current UTC month — the meter's counting window."""
    return (now or datetime.now(UTC)).replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )


def compute_pct(ai_responses: int, limit: int | None) -> int | None:
    """Percentage of AI responses used vs the monthly limit (primary metric).

    ``None`` when the plan is unlimited (enterprise) or the limit is 0 —
    the percentage is not applicable there.
    """
    if limit is None or limit <= 0:
        return None
    return round(ai_responses * 100 / limit)


def compute_over_limit(usage: PlanUsage, limits: PlanLimits) -> bool:
    """True when ANY usage metric exceeds its limit (soft — informative only)."""
    pairs = (
        (usage.ai_responses, limits.max_conversations_per_month),
        (usage.products, limits.max_products),
        (usage.businesses, limits.max_businesses),
    )
    return any(limit is not None and used > limit for used, limit in pairs)


@router.get("/usage", response_model=PlanUsageResponse)
async def get_plan_usage(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> PlanUsageResponse:
    """Current consumption vs plan limits for the ACTIVE tenant (JWT-scoped).

    ``usage.ai_responses`` = COUNT of outbound ``origin='ai'`` messages since
    the start of the month; ``usage.products`` = Σ ``products_services`` across
    the tenant's agents (JSONB, computed in Python); ``usage.businesses`` =
    the user's memberships (COUNT UserTenant). Unknown plan → basic limits.
    """
    tenant_id: uuid.UUID | None = getattr(current_user, "current_tenant_id", None)
    if tenant_id is None:
        raise HTTPException(status_code=404, detail="No active tenant")

    tenant = await session.get(Tenant, tenant_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant not found")

    plan = tenant.plan
    limits = PlanLimits(**get_plan_limits(plan))
    month_start = current_month_start()

    ai_responses = (
        await session.execute(
            select(func.count())
            .select_from(Message)
            .where(
                Message.tenant_id == tenant_id,
                Message.origin == "ai",
                Message.direction == "out",
                Message.created_at >= month_start,
            )
        )
    ).scalar_one()

    agents = (
        await session.execute(
            select(AiAgent).where(AiAgent.tenant_id == tenant_id)
        )
    ).scalars().all()
    products = sum(
        len((agent.business_config or {}).get("products_services") or [])
        for agent in agents
    )

    businesses = (
        await session.execute(
            select(func.count())
            .select_from(UserTenant)
            .where(UserTenant.user_id == current_user.id)
        )
    ).scalar_one()

    usage = PlanUsage(
        ai_responses=ai_responses,
        products=products,
        businesses=businesses,
    )
    return PlanUsageResponse(
        plan=plan,
        limits=limits,
        usage=usage,
        pct=compute_pct(usage.ai_responses, limits.max_conversations_per_month),
        over_limit=compute_over_limit(usage, limits),
    )