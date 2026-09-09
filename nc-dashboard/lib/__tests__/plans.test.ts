import { describe, expect, it } from "vitest";
import { PLAN_LABELS } from "@/lib/plans";

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

