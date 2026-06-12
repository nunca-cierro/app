import { describe, expect, it } from "vitest";

import {
  getRoleLandingRoute,
  isRouteAllowed,
  isTenantless,
} from "@/lib/rbac";
import type { UserRole } from "@/lib/types";

const ALL_ROLES: UserRole[] = ["superadmin", "admin", "agent", "client"];

describe("RBAC route matrix", () => {
  /* ── Dashboard home is universal ── */

  it.each(ALL_ROLES)("allows /dashboard for %s", (role) => {
    expect(isRouteAllowed(role, "/dashboard")).toBe(true);
  });

  it.each(ALL_ROLES)("allows /auth/login for %s", (role) => {
    expect(isRouteAllowed(role, "/auth/login")).toBe(true);
  });

  /* ── Sensitive routes blocked for client/agent ── */

  it.each(["client", "agent"] as UserRole[])(
    "blocks /dashboard/agents for %s",
    (role) => {
      expect(isRouteAllowed(role, "/dashboard/agents")).toBe(false);
    },
  );

  it.each(["client", "agent"] as UserRole[])(
    "blocks /dashboard/agents/new for %s",
    (role) => {
      expect(isRouteAllowed(role, "/dashboard/agents/new")).toBe(false);
    },
  );

  it.each(["client", "agent"] as UserRole[])(
    "blocks /dashboard/platforms for %s",
    (role) => {
      expect(isRouteAllowed(role, "/dashboard/platforms")).toBe(false);
    },
  );

  it.each(["client", "agent"] as UserRole[])(
    "blocks /dashboard/platforms/evolution/abc for %s",
    (role) => {
      expect(isRouteAllowed(role, "/dashboard/platforms/evolution/abc")).toBe(false);
    },
  );

  it.each(["client", "agent"] as UserRole[])(
    "blocks /dashboard/tenants for %s",
    (role) => {
      expect(isRouteAllowed(role, "/dashboard/tenants")).toBe(false);
    },
  );

  it.each(["client", "agent"] as UserRole[])(
    "blocks /dashboard/tenants/abc for %s",
    (role) => {
      expect(isRouteAllowed(role, "/dashboard/tenants/abc")).toBe(false);
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

  it.each(["client", "agent"] as UserRole[])(
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

  /* ── Onboarding route accessible to tenantless users ── */

  it("allows /dashboard/onboarding for tenantless users regardless of role", () => {
    // Tenantless users should be able to access onboarding
    expect(isRouteAllowed("client", "/dashboard/onboarding", null)).toBe(true);
    expect(isRouteAllowed("client", "/dashboard/onboarding", undefined)).toBe(true);
  });

  it("blocks /dashboard/onboarding for users with a tenant", () => {
    // Users with a tenant should NOT see onboarding (they'd get role-guarded)
    expect(isRouteAllowed("admin", "/dashboard/onboarding", "some-tenant-id")).toBe(false);
    expect(isRouteAllowed("agent", "/dashboard/onboarding", "some-tenant-id")).toBe(false);
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
});
