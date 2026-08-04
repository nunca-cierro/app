import { describe, expect, it } from "vitest";

import {
  tenantFormSchema,
  defaultTenantValues,
} from "@/lib/schemas/tenant";

describe("tenantFormSchema - business_profile", () => {
  it("accepts a valid business_profile with CTA and city", () => {
    const result = tenantFormSchema.safeParse({
      ...defaultTenantValues,
      business_profile: {
        business_name: "Panadería El Trigal",
        business_location: "Calle 10 #5-20, Medellín",
        business_schedule: "Lun-Dom 6:00-21:00",
        business_cta: "Pedí por WhatsApp al +57 300 000 0000",
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.business_profile?.business_cta).toContain("WhatsApp");
    }
  });

  it("business_profile is optional", () => {
    const result = tenantFormSchema.safeParse({
      ...defaultTenantValues,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.business_profile).toBeUndefined();
    }
  });

  it("rejects non-string profile values", () => {
    const result = tenantFormSchema.safeParse({
      ...defaultTenantValues,
      business_profile: { business_name: 42 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown profile keys", () => {
    const result = tenantFormSchema.safeParse({
      ...defaultTenantValues,
      business_profile: { mystery_key: "nope" },
    });
    expect(result.success).toBe(false);
  });
});
