"""Plan capability matrix — single source of truth for plan → capabilities/limits.

Every plan/role decision (dashboard access, agent/connection creation, AI
responses, business-config editing) MUST be derived from this module instead of
scattered string literals in handlers, routers, or the frontend.

Plans (current): ``trial``, ``basic``, ``professional``, ``enterprise``.
Prices intentionally live ONLY in the marketing/frontend layer — this module
never defines monetary values.

Limits semantics (plan-differentiation): ``max_conversations_per_month`` counts
**AI responses** — outbound messages persisted with ``origin='ai'`` — per tenant
per month (NOT raw conversations; programmed FAQ and escalations do not count).
Limits are informative/consumable (soft): nothing in this module enforces or
bills against them. ``None`` = unlimited — applies to ``max_agents``,
``max_products`` and ``max_businesses`` for enterprise; its AI cap is 100.000
responses/month (see PLAN_LIMITS).
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
# Every plan carries AI (CAP_AI); trial/basic run the programmed keyword/FAQ
# path as a soft-cap fallback (see the limits section). Agent/connection/
# business management (agents.manage, connections.manage, business.edit)
# stays professional+ only. Superadmin is exempt from plan gates (platform
# operator provisions agents/connections for any plan).

PLAN_CAPABILITIES: Final[dict[str, frozenset[str]]] = {
    "trial": frozenset(
        {CAP_DASHBOARD_VIEW, CAP_CONVERSATIONS_VIEW, CAP_AI}
    ),
    "basic": frozenset(
        {CAP_DASHBOARD_VIEW, CAP_CONVERSATIONS_VIEW, CAP_AI}
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
# max_conversations_per_month = AI responses (origin='ai') per tenant per month.
# Every plan carries a soft monthly AI cap (500/2000/10000/100000); enterprise
# caps at 100.000 AI responses/month (fair use — soft, the top plan has no
# self-service plan above it). When a cap is exhausted the handler falls back
# to programmed FAQ responses instead of calling the LLM. Limits are always
# soft: consumed by GET /plans/usage for the meter and by the handler's
# fallback gate, never billing or hard-blocking. None = unlimited applies to
# max_agents / max_products / max_businesses only.
PLAN_LIMITS: Final[dict[str, dict[str, int | None]]] = {
    "trial": {
        "max_agents": 1,
        "max_products": 25,
        "max_conversations_per_month": 500,
        "max_businesses": 1,
    },
    "basic": {
        "max_agents": 1,
        "max_products": 50,
        "max_conversations_per_month": 2000,
        "max_businesses": 1,
    },
    "professional": {
        "max_agents": 10,
        "max_products": 200,
        "max_conversations_per_month": 10000,
        "max_businesses": 5,
    },
    "enterprise": {
        "max_agents": None,
        "max_products": None,
        "max_conversations_per_month": 100000,
        "max_businesses": None,
    },
}

# Free-trial window in days (kept here — not hardcoded in the handler).
TRIAL_DAYS: Final[int] = 3

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
