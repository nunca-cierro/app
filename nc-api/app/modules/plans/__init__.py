"""Plans module — capability matrix, limits, and enforcement dependencies."""

from app.modules.plans.capabilities import (
    CAP_AGENTS_MANAGE,
    CAP_AI,
    CAP_BUSINESS_EDIT,
    CAP_BUSINESS_VIEW,
    CAP_CONNECTIONS_MANAGE,
    CAP_CONVERSATIONS_VIEW,
    CAP_DASHBOARD_VIEW,
    DEFAULT_PLAN,
    PLAN_CAPABILITIES,
    PLAN_LIMITS,
    SUPPORTED_PLANS,
    TRIAL_DAYS,
    effective_capabilities,
    get_plan_capabilities,
    get_plan_limits,
    plan_has_capability,
)
from app.modules.plans.deps import RequireCapability, require_capability

__all__ = [
    "CAP_AGENTS_MANAGE",
    "CAP_AI",
    "CAP_BUSINESS_EDIT",
    "CAP_BUSINESS_VIEW",
    "CAP_CONNECTIONS_MANAGE",
    "CAP_CONVERSATIONS_VIEW",
    "CAP_DASHBOARD_VIEW",
    "DEFAULT_PLAN",
    "PLAN_CAPABILITIES",
    "PLAN_LIMITS",
    "SUPPORTED_PLANS",
    "TRIAL_DAYS",
    "RequireCapability",
    "effective_capabilities",
    "get_plan_capabilities",
    "get_plan_limits",
    "plan_has_capability",
    "require_capability",
]
