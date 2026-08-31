import { describe, expect, it } from "vitest";
import {
  SIGNED_IN_COOKIE,
  clearSignedInCookie,
  evaluateDashboardAccess,
  setSignedInCookie,
} from "@/lib/route-guard";

describe("evaluateDashboardAccess (T4 — proxy guard)", () => {
  it("allows /dashboard pages when the signed-in cookie is present", () => {
    expect(evaluateDashboardAccess("/dashboard", true)).toBeNull();
    expect(evaluateDashboardAccess("/dashboard/agents", true)).toBeNull();
    expect(evaluateDashboardAccess("/dashboard/tenants/abc", true)).toBeNull();
  });

  it("redirects /dashboard pages to /auth/login when the cookie is absent", () => {
    expect(evaluateDashboardAccess("/dashboard", false)).toBe("/auth/login");
    expect(evaluateDashboardAccess("/dashboard/platforms", false)).toBe(
      "/auth/login",
    );
  });

  it("never guards routes outside /dashboard", () => {
    expect(evaluateDashboardAccess("/auth/login", false)).toBeNull();
    expect(evaluateDashboardAccess("/", false)).toBeNull();
    expect(evaluateDashboardAccess("/api/v1/tenants", false)).toBeNull();
    expect(evaluateDashboardAccess("/inicio", false)).toBeNull();
  });
});

describe("signed-in cookie helpers (client-side marker)", () => {
  it("exposes the nc_signed_in cookie name used by the proxy", () => {
    expect(SIGNED_IN_COOKIE).toBe("nc_signed_in");
  });

  it("no-ops safely in a server environment (no document)", () => {
    // Node/test env has no `document` — the helpers must not throw.
    expect(() => setSignedInCookie()).not.toThrow();
    expect(() => clearSignedInCookie()).not.toThrow();
  });
});