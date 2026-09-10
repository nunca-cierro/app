import { describe, expect, it } from "vitest";
import { preciosPage } from "@/data/precios";
import { landingPricing } from "@/data/landing/pricing";

describe("preciosPage (Escenario A pricing page data)", () => {
  it("defines a hero with an H1-able title and section id", () => {
    expect(preciosPage.sectionId).toBe("precios");
    expect(preciosPage.hero.title).toMatch(/WhatsApp/);
    expect(preciosPage.hero.subtitle).toContain("24 horas");
  });

  it("reuses the advisory WhatsApp text for the hero CTA (no invented numbers)", () => {
    expect(preciosPage.hero.cta.primary.whatsappText).toContain(
      "asesoría gratis",
    );
  });

  it("flags the trial as programmed-only (no AI)", () => {
    expect(preciosPage.trialNote).toMatch(/programadas/);
    expect(preciosPage.trialNote).toMatch(/sin inteligencia artificial/i);
  });

  it("keeps the Corporativo CTA gated (quote request, not self-service)", () => {
    expect(preciosPage.corporate.ctaLabel).toContain("Cotizar");
    expect(preciosPage.corporate.whatsappText).toMatch(/Corporativo/);
  });
});

describe("web one-time pricing untouched (separate product line)", () => {
  it("still shows the validated web prices", () => {
    const byName = Object.fromEntries(
      landingPricing.packages.map((p) => [p.name, p.price]),
    );
    expect(byName["Básico"]).toBe("Desde $699.900 COP");
    expect(byName["Profesional"]).toBe("Desde $999.000 COP");
    expect(byName["Premium"]).toBe("Desde $1.799.000 COP");
  });

  it("does not mix monthly SaaS prices into the web line", () => {
    const prices = landingPricing.packages.map((p) => p.price).join(" ");
    expect(prices).not.toContain("/mes");
    expect(prices).not.toContain("$390.000");
  });
});