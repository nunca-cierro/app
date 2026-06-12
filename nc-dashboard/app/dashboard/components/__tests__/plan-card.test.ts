import { describe, expect, it } from "vitest";
import { formatPrice, PLANS_CONFIG } from "@/app/dashboard/components/plan-card";

describe("formatPrice", () => {
  it("formats basic plan price", () => {
    expect(formatPrice(60000)).toBe("$60.000");
  });

  it("formats professional plan price", () => {
    expect(formatPrice(120000)).toBe("$120.000");
  });

  it("formats enterprise plan price", () => {
    expect(formatPrice(250000)).toBe("$250.000");
  });

  it("formats zero", () => {
    expect(formatPrice(0)).toBe("$0");
  });
});

describe("PLANS_CONFIG", () => {
  it("defines all three paid plans", () => {
    expect(Object.keys(PLANS_CONFIG)).toEqual(["basic", "professional", "enterprise"]);
  });

  it("has correct labels", () => {
    expect(PLANS_CONFIG.basic.label).toBe("Básico");
    expect(PLANS_CONFIG.professional.label).toBe("Profesional");
    expect(PLANS_CONFIG.enterprise.label).toBe("Empresarial");
  });

  it("has correct prices", () => {
    expect(PLANS_CONFIG.basic.price).toBe(60000);
    expect(PLANS_CONFIG.professional.price).toBe(120000);
    expect(PLANS_CONFIG.enterprise.price).toBe(250000);
  });

  it("has features for each plan", () => {
    for (const plan of Object.values(PLANS_CONFIG)) {
      expect(plan.features.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("professional features include AI mention", () => {
    const hasAI = PLANS_CONFIG.professional.features.some((f) =>
      f.toLowerCase().includes("inteligencia artificial"),
    );
    expect(hasAI).toBe(true);
  });

  it("enterprise features include unlimited mention", () => {
    const hasUnlimited = PLANS_CONFIG.enterprise.features.some((f) =>
      f.toLowerCase().includes("ilimitados"),
    );
    expect(hasUnlimited).toBe(true);
  });
});
