import { describe, expect, it } from "vitest";
import { PLAN_LABELS, PLAN_PRICES, PLAN_FEATURES } from "@/lib/plans";

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

describe("PLAN_PRICES", () => {
  it("defines paid plans with correct prices", () => {
    expect(PLAN_PRICES.basic).toBe(60000);
    expect(PLAN_PRICES.professional).toBe(120000);
    expect(PLAN_PRICES.enterprise).toBe(250000);
  });

  it("does not include trial price", () => {
    expect(PLAN_PRICES.trial).toBeUndefined();
  });
});

describe("PLAN_FEATURES", () => {
  it("defines features for all four plans", () => {
    expect(Object.keys(PLAN_FEATURES)).toEqual(["trial", "basic", "professional", "enterprise"]);
  });

  it("each plan has at least one feature", () => {
    for (const features of Object.values(PLAN_FEATURES)) {
      expect(features.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("enterprise features mention unlimited", () => {
    const hasUnlimited = PLAN_FEATURES.enterprise.some((f) =>
      f.toLowerCase().includes("ilimitad"),
    );
    expect(hasUnlimited).toBe(true);
  });
});
