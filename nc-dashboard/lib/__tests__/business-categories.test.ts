import { describe, expect, it } from "vitest";

import { BUSINESS_CATEGORIES, TEMPLATE_CATEGORIES } from "@/lib/business-categories";

describe("business-categories registry", () => {
  it("covers template categories with labels", () => {
    expect(BUSINESS_CATEGORIES.restaurante).toBe("Restaurante");
    expect(BUSINESS_CATEGORIES.panaderia).toBe("Panadería");
    expect(BUSINESS_CATEGORIES.hamburgueseria).toBe("Hamburguesería");
    expect(BUSINESS_CATEGORIES.barberia).toBe("Barbería");
    expect(BUSINESS_CATEGORIES.clinica).toBe("Clínica");
  });

  it("template categories are a subset of the registry", () => {
    for (const slug of TEMPLATE_CATEGORIES) {
      expect(slug in BUSINESS_CATEGORIES).toBe(true);
    }
  });

  it("labels are unique", () => {
    const labels = Object.values(BUSINESS_CATEGORIES);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
