import { describe, expect, it } from "vitest";

import {
  canCreateAgents,
  canManagePlatforms,
  canSeeQuickActions,
  getRoleLandingRoute,
  isRouteAllowed,
  isTenantless,
} from "@/lib/rbac";
import type { UserRole } from "@/lib/types";

const ALL_ROLES: UserRole[] = ["superadmin", "admin", "client"];

describe("RBAC route matrix", () => {
  /* ── Dashboard home is universal ── */

  it.each(ALL_ROLES)("allows /dashboard for %s", (role) => {
    expect(isRouteAllowed(role, "/dashboard")).toBe(true);
  });

  it.each(ALL_ROLES)("allows /auth/login for %s", (role) => {
    expect(isRouteAllowed(role, "/auth/login")).toBe(true);
  });

  /* ── Sensitive routes blocked for client ── */

  it.each(["client"] as UserRole[])(
    "blocks /dashboard/agents for %s",
    (role) => {
      expect(isRouteAllowed(role, "/dashboard/agents")).toBe(false);
    },
  );

  it.each(["client"] as UserRole[])(
    "blocks /dashboard/agents/new for %s",
    (role) => {
      expect(isRouteAllowed(role, "/dashboard/agents/new")).toBe(false);
    },
  );

  it.each(["client"] as UserRole[])(
    "blocks /dashboard/platforms for %s",
    (role) => {
      expect(isRouteAllowed(role, "/dashboard/platforms")).toBe(false);
    },
  );

  it.each(["client"] as UserRole[])(
    "blocks /dashboard/platforms/evolution/abc for %s",
    (role) => {
      expect(isRouteAllowed(role, "/dashboard/platforms/evolution/abc")).toBe(false);
    },
  );

  it.each(["client"] as UserRole[])(
    "allows /dashboard/tenants for %s (own business card — owner decision #1)",
    (role) => {
      expect(isRouteAllowed(role, "/dashboard/tenants")).toBe(true);
    },
  );

  it.each(["client"] as UserRole[])(
    "allows /dashboard/tenants/abc for %s (own business card — owner decision #1)",
    (role) => {
      expect(isRouteAllowed(role, "/dashboard/tenants/abc")).toBe(true);
    },
  );

  /* ── Admin routes allowed for admin/superadmin ── */

  it.each(["admin", "superadmin"] as UserRole[])(
    "allows /dashboard/agents for %s",
    (role) => {
      expect(isRouteAllowed(role, "/dashboard/agents")).toBe(true);
    },
  );

  it.each(["admin", "superadmin"] as UserRole[])(
    "allows /dashboard/platforms for %s",
    (role) => {
      expect(isRouteAllowed(role, "/dashboard/platforms")).toBe(true);
    },
  );

  it.each(["admin", "superadmin"] as UserRole[])(
    "allows /dashboard/tenants for %s",
    (role) => {
      expect(isRouteAllowed(role, "/dashboard/tenants")).toBe(true);
    },
  );

  /* ── Conversations is accessible to all ── */

  it.each(ALL_ROLES)("allows /dashboard/conversations for %s", (role) => {
    expect(isRouteAllowed(role, "/dashboard/conversations")).toBe(true);
  });

  it.each(ALL_ROLES)("allows /dashboard/conversations/abc for %s", (role) => {
    expect(isRouteAllowed(role, "/dashboard/conversations/abc")).toBe(true);
  });

  /* ── Landing routes ── */

  it.each(["client"] as UserRole[])(
    "lands on /dashboard/conversations for %s",
    (role) => {
      expect(getRoleLandingRoute(role)).toBe("/dashboard/conversations");
    },
  );

  it("lands on /dashboard for superadmin", () => {
    expect(getRoleLandingRoute("superadmin")).toBe("/dashboard");
  });

  it("lands on /dashboard/tenants for admin", () => {
    expect(getRoleLandingRoute("admin")).toBe("/dashboard/tenants");
  });

  /* ── Onboarding route removed — self-registration disabled ── */

  it("blocks /dashboard/onboarding for all users (route removed)", () => {
    expect(isRouteAllowed("client", "/dashboard/onboarding", null)).toBe(false);
    expect(isRouteAllowed("admin", "/dashboard/onboarding", "some-tenant-id")).toBe(false);
  });

  /* ── isTenantless ── */

  it("detects tenantless user", () => {
    expect(isTenantless({ tenant_id: null })).toBe(true);
    expect(isTenantless({ tenant_id: undefined })).toBe(true);
    expect(isTenantless({ current_tenant_id: null })).toBe(true);
    expect(isTenantless({ current_tenant_id: null, tenant_id: undefined })).toBe(true);
  });

  it("detects user with tenant", () => {
    expect(isTenantless({ tenant_id: "abc-123" })).toBe(false);
    expect(isTenantless({ current_tenant_id: "abc-123" })).toBe(false);
  });

  it("superadmin is never tenantless", () => {
    expect(isTenantless({ role: "superadmin", tenant_id: null })).toBe(false);
    expect(isTenantless({ current_role: "superadmin", tenant_id: undefined })).toBe(false);
  });
});

describe("canSeeQuickActions (RV-4 — superadmin-only affordances)", () => {
  it("returns true only for superadmin", () => {
    expect(canSeeQuickActions("superadmin")).toBe(true);
    expect(canSeeQuickActions("admin")).toBe(false);
    expect(canSeeQuickActions("client")).toBe(false);
  });

  it("degrades to false for null/undefined/missing roles", () => {
    expect(canSeeQuickActions(null)).toBe(false);
    expect(canSeeQuickActions(undefined)).toBe(false);
  });
});

describe("canManagePlatforms (T2 — platforms are admin/superadmin managed)", () => {
  it("returns true for admin and superadmin", () => {
    expect(canManagePlatforms("superadmin")).toBe(true);
    expect(canManagePlatforms("admin")).toBe(true);
  });

  it("returns false for client (read-only)", () => {
    expect(canManagePlatforms("client")).toBe(false);
  });

  it("degrades to false for null/undefined/missing roles", () => {
    expect(canManagePlatforms(null)).toBe(false);
    expect(canManagePlatforms(undefined)).toBe(false);
    expect(canManagePlatforms("")).toBe(false);
  });
});

describe("canCreateAgents (T3 — agents/new is admin/superadmin only)", () => {
  it("returns true for admin and superadmin", () => {
    expect(canCreateAgents("superadmin")).toBe(true);
    expect(canCreateAgents("admin")).toBe(true);
  });

  it("returns false for client (read-only)", () => {
    expect(canCreateAgents("client")).toBe(false);
  });

  it("degrades to false for null/undefined/missing roles", () => {
    expect(canCreateAgents(null)).toBe(false);
    expect(canCreateAgents(undefined)).toBe(false);
    expect(canCreateAgents("")).toBe(false);
  });
});
