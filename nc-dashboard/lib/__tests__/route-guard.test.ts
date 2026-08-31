import { describe, expect, it } from "vitest";
import {
  SIGNED_IN_COOKIE,
  ACCESS_TOKEN_COOKIE,
  clearSignedInCookie,
  evaluateDashboardAccess,
  evaluateDashboardAccessWithRole,
  setSignedInCookie,
  shouldRedirectOn401,
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

describe("evaluateDashboardAccessWithRole (Slice B — server role gate)", () => {
  it("allows a role on its own routes", () => {
    expect(
      evaluateDashboardAccessWithRole("/dashboard/agents", "admin", true),
    ).toBeNull();
    expect(
      evaluateDashboardAccessWithRole("/dashboard/tenants/abc", "admin", true),
    ).toBeNull();
    expect(
      evaluateDashboardAccessWithRole("/dashboard", "superadmin", true),
    ).toBeNull();
  });

  it("redirects client away from agents/platforms/admin to their landing", () => {
    expect(
      evaluateDashboardAccessWithRole("/dashboard/agents", "client", true),
    ).toBe("/dashboard/conversations");
    expect(
      evaluateDashboardAccessWithRole("/dashboard/platforms", "client", true),
    ).toBe("/dashboard/conversations");
    expect(
      evaluateDashboardAccessWithRole("/dashboard/admin/users", "client", true),
    ).toBe("/dashboard/conversations");
  });

  it("lets client through on conversations and their own tenants", () => {
    expect(
      evaluateDashboardAccessWithRole("/dashboard/conversations", "client", true),
    ).toBeNull();
    expect(
      evaluateDashboardAccessWithRole("/dashboard/tenants/abc", "client", true),
    ).toBeNull();
  });

  it("redirects admin away from the superadmin-only /dashboard/admin tree", () => {
    expect(
      evaluateDashboardAccessWithRole("/dashboard/admin/users", "admin", true),
    ).toBe("/dashboard/tenants");
  });

  it("falls back to the signed-in marker when no role is decoded", () => {
    expect(
      evaluateDashboardAccessWithRole("/dashboard/agents", null, false),
    ).toBe("/auth/login");
    expect(
      evaluateDashboardAccessWithRole("/dashboard/agents", null, true),
    ).toBeNull();
  });
});

describe("shouldRedirectOn401 (Slice B loop guard)", () => {
  it("redirects when a 401 happens on protected /dashboard pages", () => {
    expect(shouldRedirectOn401("/dashboard")).toBe(true);
    expect(shouldRedirectOn401("/dashboard/agents")).toBe(true);
    expect(shouldRedirectOn401("/dashboard/conversations/abc")).toBe(true);
  });

  it("never redirects on public pages that must render unauthenticated", () => {
    expect(shouldRedirectOn401("/auth/login")).toBe(false);
    expect(shouldRedirectOn401("/auth/register")).toBe(false);
    expect(shouldRedirectOn401("/inicio")).toBe(false);
    expect(shouldRedirectOn401("/")).toBe(false);
    expect(shouldRedirectOn401("/whatsapp")).toBe(false);
    expect(shouldRedirectOn401("/legal")).toBe(false);
  });
});

describe("signed-in cookie helpers (client-side marker)", () => {
  it("exposes the nc_signed_in cookie name used by the proxy", () => {
    expect(SIGNED_IN_COOKIE).toBe("nc_signed_in");
  });

  it("exposes the httpOnly session cookie name (Slice B)", () => {
    expect(ACCESS_TOKEN_COOKIE).toBe("nc_access_token");
  });

  it("exposes the httpOnly session cookie name (Slice B)", () => {
    expect(ACCESS_TOKEN_COOKIE).toBe("nc_access_token");
  });

  it("no-ops safely in a server environment (no document)", () => {
    // Node/test env has no `document` — the helpers must not throw.
    expect(() => setSignedInCookie()).not.toThrow();
    expect(() => clearSignedInCookie()).not.toThrow();
  });
});