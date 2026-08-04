/**
 * Frontend capability helpers — consume the capability list exposed by the
 * backend via `/auth/me` (and login/switch-tenant responses).
 *
 * The BACKEND is the source of truth for plan → capabilities
 * (nc-api/app/modules/plans/capabilities.py). This module only reads
 * `user.capabilities`; a conservative role/plan fallback keeps sessions that
 * predate the field working without a re-login (nobody gets locked out).
 */

export const CAPABILITIES = {
  dashboardView: "dashboard.view",
  conversationsView: "conversations.view",
  agentsManage: "agents.manage",
  connectionsManage: "connections.manage",
  ai: "ai.responses",
  businessView: "business.view",
  businessEdit: "business.edit",
} as const;

export type Capability = (typeof CAPABILITIES)[keyof typeof CAPABILITIES];

const ALL_CAPABILITIES: Capability[] = Object.values(CAPABILITIES);

export interface CapabilityUser {
  role?: string | null;
  current_role?: string | null;
  plan?: string | null;
  capabilities?: string[] | null;
}

/**
 * Safe fallback for sessions that predate the `capabilities` field — mirrors
 * the backend matrix (basic/trial → view-only; professional adds management,
 * AI and business edit; superadmin → everything).
 */
function fallbackCapabilities(user: CapabilityUser): Capability[] {
  const role = user.current_role ?? user.role;
  const plan = user.plan ?? null;

  if (role === "superadmin") return [...ALL_CAPABILITIES];
  if (plan === "professional" || plan === "enterprise") {
    return [
      CAPABILITIES.dashboardView,
      CAPABILITIES.conversationsView,
      CAPABILITIES.agentsManage,
      CAPABILITIES.connectionsManage,
      CAPABILITIES.ai,
      CAPABILITIES.businessView,
      CAPABILITIES.businessEdit,
    ];
  }
  // basic/trial/unknown → view-only dashboard + conversations
  return [CAPABILITIES.dashboardView, CAPABILITIES.conversationsView];
}

/**
 * True when the user holds the capability. When the backend announced
 * capabilities, THEY are authoritative. Otherwise the role/plan fallback
 * applies (legacy sessions only).
 */
export function hasCapability(
  user: CapabilityUser | null | undefined,
  capability: Capability,
): boolean {
  if (!user) return false;
  const caps = user.capabilities;
  if (Array.isArray(caps)) {
    return caps.includes(capability);
  }
  return fallbackCapabilities(user).includes(capability);
}
