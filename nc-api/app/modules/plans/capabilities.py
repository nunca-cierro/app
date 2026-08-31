"""Plan capability matrix — single source of truth for plan → capabilities/limits.

Every plan/role decision (dashboard access, agent/connection creation, AI
responses, business-config editing) MUST be derived from this module instead of
scattered string literals in handlers, routers, or the frontend.

Plans (current): ``trial``, ``basic``, ``professional``, ``enterprise``.
Prices intentionally live ONLY in the marketing/frontend layer — this module
never defines monetary values.
"""

from __future__ import annotations

from typing import Final

from app.modules.auth.models import UserRole

# ── Capabilities ────────────────────────────────────────────────────────────
# Lowercase dot-strings so they serialize cleanly to JSON (/auth/me) and can be
# consumed verbatim by the frontend (lib/capabilities.ts).

CAP_DASHBOARD_VIEW: Final[str] = "dashboard.view"
CAP_CONVERSATIONS_VIEW: Final[str] = "conversations.view"
CAP_AGENTS_MANAGE: Final[str] = "agents.manage"  # create/update/delete agents
CAP_CONNECTIONS_MANAGE: Final[str] = "connections.manage"  # create/update/delete connections
CAP_AI: Final[str] = "ai.responses"  # Groq AI replies (vs. programmed FAQ responses)
CAP_BUSINESS_VIEW: Final[str] = "business.view"  # read business config
CAP_BUSINESS_EDIT: Final[str] = "business.edit"  # edit business config / products

# Read-only capability set for client (and any stale/unknown) roles — the ONLY
# caps a client ever holds, regardless of tenant plan. business.view is kept so
# the client dashboard still renders the (read-only) business config.
CLIENT_VIEW_ONLY: Final[frozenset[str]] = frozenset(
    {CAP_DASHBOARD_VIEW, CAP_CONVERSATIONS_VIEW, CAP_BUSINESS_VIEW}
)

# ── Plan matrix ─────────────────────────────────────────────────────────────
# trial/basic run programmed keyword/FAQ responses; professional/enterprise
# unlock AI + tenant management capabilities. Superadmin is exempt from plan
# gates (platform operator provisions agents/connections for any plan).

PLAN_CAPABILITIES: Final[dict[str, frozenset[str]]] = {
    "trial": frozenset(
        {CAP_DASHBOARD_VIEW, CAP_CONVERSATIONS_VIEW}
    ),
    "basic": frozenset(
        {CAP_DASHBOARD_VIEW, CAP_CONVERSATIONS_VIEW}
    ),
    "professional": frozenset(
        {
            CAP_DASHBOARD_VIEW,
            CAP_CONVERSATIONS_VIEW,
            CAP_AGENTS_MANAGE,
            CAP_CONNECTIONS_MANAGE,
            CAP_AI,
            CAP_BUSINESS_VIEW,
            CAP_BUSINESS_EDIT,
        }
    ),
    "enterprise": frozenset(
        {
            CAP_DASHBOARD_VIEW,
            CAP_CONVERSATIONS_VIEW,
            CAP_AGENTS_MANAGE,
            CAP_CONNECTIONS_MANAGE,
            CAP_AI,
            CAP_BUSINESS_VIEW,
            CAP_BUSINESS_EDIT,
        }
    ),
}

# ── Limits per plan (None = unlimited) ──────────────────────────────────────
PLAN_LIMITS: Final[dict[str, dict[str, int | None]]] = {
    "trial": {
        "max_agents": 1,
        "max_products": 10,
        "max_conversations_per_month": 100,
        "max_businesses": 1,
    },
    "basic": {
        "max_agents": 1,
        "max_products": 10,
        "max_conversations_per_month": 500,
        "max_businesses": 1,
    },
    "professional": {
        "max_agents": 5,
        "max_products": 50,
        "max_conversations_per_month": 5000,
        "max_businesses": 3,
    },
    "enterprise": {
        "max_agents": None,
        "max_products": None,
        "max_conversations_per_month": None,
        "max_businesses": None,
    },
}

# Free-trial window in days (kept here — not hardcoded in the handler).
TRIAL_DAYS: Final[int] = 7

DEFAULT_PLAN: Final[str] = "basic"

# Allowed plan identifiers (used by Tenant schemas for validation).
SUPPORTED_PLANS: Final[frozenset[str]] = frozenset(PLAN_CAPABILITIES)


def get_plan_capabilities(plan: str | None) -> frozenset[str]:
    """Return the capability set for a plan (unknown/None → safe default)."""
    if not plan:
        return PLAN_CAPABILITIES[DEFAULT_PLAN]
    return PLAN_CAPABILITIES.get(plan, PLAN_CAPABILITIES[DEFAULT_PLAN])


def plan_has_capability(plan: str | None, capability: str) -> bool:
    """True when the tenant's plan grants the given capability."""
    return capability in get_plan_capabilities(plan)


def get_plan_limits(plan: str | None) -> dict[str, int | None]:
    """Return the limit map for a plan (unknown/None → safe default)."""
    if not plan:
        return PLAN_LIMITS[DEFAULT_PLAN]
    return PLAN_LIMITS.get(plan, PLAN_LIMITS[DEFAULT_PLAN])


def effective_capabilities(role: str | UserRole | None, plan: str | None) -> frozenset[str]:
    """Capabilities the user effectively holds for role + tenant plan.

    Total over role: superadmin is the platform operator — exempt from plan
    gates and always gets the union of every plan's capabilities. Admin is
    plan-gated as before. Client (and any stale/unknown role) is view-only on
    ANY plan: business.edit is role-gated, never plan-gated (a professional or
    enterprise client must NOT receive edit capabilities).
    """
    if role == UserRole.SUPERADMIN:
        return frozenset().union(*PLAN_CAPABILITIES.values())
    if role == UserRole.ADMIN:
        return get_plan_capabilities(plan)
    return CLIENT_VIEW_ONLY
