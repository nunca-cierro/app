import { describe, expect, it } from "vitest";
import { buildTenantPatchBody } from "@/hooks/use-tenant";
import type { TenantFormValues } from "@/lib/schemas/tenant";

/**
 * T5 — the PATCH body for /tenants/{id} must exclude plan/slug for client
 * (the backend now REJECTS non-business-card fields for client with 403).
 * Admin/superadmin keep sending the full form (slug auto-generated).
 */

const values: TenantFormValues = {
  name: "Panaderia Renovada",
  plan: "enterprise",
  timezone: "America/Argentina/Buenos_Aires",
  locale: "es-AR",
  notes: "Nueva nota",
  business_profile: {
    business_name: "Don José",
  },
};

describe("buildTenantPatchBody (T5)", () => {
  it("client sends ONLY business-card fields — no plan, slug or business_profile", () => {
    const body = buildTenantPatchBody(values, "client");

    expect(body).toEqual({
      name: "Panaderia Renovada",
      timezone: "America/Argentina/Buenos_Aires",
      locale: "es-AR",
      notes: "Nueva nota",
    });
  });

  it("admin sends the full form plus the auto-generated slug", () => {
    const body = buildTenantPatchBody(values, "admin");

    expect(body.plan).toBe("enterprise");
    expect(body.slug).toBe("panaderia-renovada");
    expect(body.business_profile).toEqual({ business_name: "Don José" });
  });

  it("superadmin sends the full form plus the auto-generated slug", () => {
    const body = buildTenantPatchBody(values, "superadmin");

    expect(body.plan).toBe("enterprise");
    expect(body.slug).toBe("panaderia-renovada");
  });

  it("missing/unknown role defaults to the admin full-form behavior", () => {
    const body = buildTenantPatchBody(values, null);

    expect(body.slug).toBe("panaderia-renovada");
    expect(body.plan).toBe("enterprise");
  });
});