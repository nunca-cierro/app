import { describe, expect, it } from "vitest";

import {
  getRoleLandingRoute,
  isRouteAllowed,
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
});
