import { describe, expect, it } from "vitest";
import { PLAN_LABELS, PRICE_LABELS } from "@/lib/plans";

describe("PLAN_LABELS", () => {
  it("defines all four plans", () => {
    expect(Object.keys(PLAN_LABELS)).toEqual(["trial", "basic", "professional", "enterprise"]);
  });

  it("has correct labels", () => {
    expect(PLAN_LABELS.trial).toBe("Prueba");
    expect(PLAN_LABELS.basic).toBe("Básico");
    expect(PLAN_LABELS.professional).toBe("Profesional");
    expect(PLAN_LABELS.enterprise).toBe("Empresarial");
  });
});

describe("PRICE_LABELS (Escenario A — plan-differentiation)", () => {
  it("uses the exact Escenario A copy for the three paid tiers", () => {
    expect(PRICE_LABELS.basic).toBe("Desde $390.000/mes + IVA");
    expect(PRICE_LABELS.professional).toBe("Desde $790.000/mes + IVA");
    expect(PRICE_LABELS.enterprise).toBe("Desde $1.590.000/mes + IVA");
  });

  it("never drops the '+ IVA' framing on a paid tier", () => {
    for (const value of Object.values(PRICE_LABELS)) {
      expect(value.startsWith("Desde ")).toBe(true);
      expect(value).toContain("/mes + IVA");
    }
  });

});

