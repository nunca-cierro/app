import { describe, expect, it } from "vitest";
import { landingHero } from "@/data/landing/hero";
import { landingServices } from "@/data/landing/services";
import { landingProcess } from "@/data/landing/process";
import { landingExamples } from "@/data/landing/examples";
import { landingPricing } from "@/data/landing/pricing";
import { landingFaq } from "@/data/landing/faq";
import { landingContact } from "@/data/landing/contact";
import { landingAutomation } from "@/data/landing/automation";

/**
 * /inicio — web one-time service landing (SECONDARY product line).
 *
 * Every `data/landing/*` module is RENDERED on /inicio via
 * `components/landing-content.tsx` (hero → services → process → examples →
 * pricing → faq → contact → automation cross-sell). The prior audit called
 * them dead leftovers — they are NOT; only the copy was left in tú while the
 * rest of the app was swept to usted. These tests pin the TUTEO register
 * (owner-confirmed: full tú, no usted, no voseo), the
 * one-time web pricing (untouched numbers) and the cross-sell back to the
 * WhatsApp automation primary line.
 */

const ustedPattern =
  /(usted|ustedes|déjeme|cuéntenos|escríbanos|contáctenos|Elija|Cancele|Agende una|su negocio|su empresa|sus clientes|su WhatsApp|su sitio|su plan|su bot|su equipo|le orientamos|le mostramos|le recomendamos|le gustaría|le conviene|le mantenemos|le ayudamos|le respondemos|le acompañamos|tenés|querés|podés|volvé|mirá|dale|tranqui|al toque)/i;

const userFacingTexts = [
  landingHero.title,
  landingHero.subtitle,
  ...landingHero.disclaimer,
  landingServices.title,
  landingServices.badge,
  ...landingServices.services.flatMap((s) => [s.title, s.description]),
  landingProcess.title,
  landingProcess.subtitle,
  landingProcess.footerText,
  ...landingProcess.steps.flatMap((s) => [s.title, s.description]),
  landingExamples.title,
  landingExamples.subtitle,
  landingExamples.secondarySubtitle,
  landingExamples.cta.title,
  landingExamples.cta.description,
  landingPricing.title,
  landingPricing.subtitle,
  landingPricing.footerText,
  landingPricing.guaranteeText,
  ...landingPricing.packages.flatMap((p) => [p.description, ...p.features]),
  landingPricing.comparison.title,
  landingPricing.comparison.subtitle,
  landingPricing.optionalExtras.title,
  landingPricing.optionalExtras.subtitle,
  ...landingPricing.optionalExtras.items.flatMap((e) => [
    e.description,
    ...e.includes,
  ]),
  landingPricing.advisoryCta.title,
  landingPricing.advisoryCta.description,
  ...landingFaq.items.flatMap((f) => [f.question, f.answer]),
  landingContact.title,
  landingContact.subtitle,
  landingContact.quickResponseText,
  landingContact.confidenceText,
  landingAutomation.label,
  landingAutomation.title,
  landingAutomation.description,
  landingAutomation.primary.ctaLabel,
  landingAutomation.secondary.ctaLabel,
];

describe("/inicio web landing — register (tuteo, no usted, no voseo)", () => {
  it("uses tú (tuteo) forms in every rendered web-landing string", () => {
    for (const text of userFacingTexts) {
      expect(text).not.toMatch(ustedPattern);
    }
  });

  it("addresses the reader with tú in the web landing", () => {
    expect(landingHero.title).toMatch(/tu negocio/);
    expect(landingHero.subtitle).toMatch(/Te creamos/i);
    expect(landingPricing.subtitle).toMatch(/ayudarte|tu sitio web/);
    expect(landingContact.title).toMatch(/tu negocio/);
  });
});

describe("web one-time pricing untouched (secondary product line)", () => {
  it("keeps the validated one-time prices (no /mes, no SaaS mix)", () => {
    const byName = Object.fromEntries(
      landingPricing.packages.map((p) => [p.name, p.price]),
    );
    expect(byName["Básico"]).toBe("Desde $699.900 COP");
    expect(byName["Profesional"]).toBe("Desde $999.000 COP");
    expect(byName["Premium"]).toBe("Desde $1.799.000 COP");
    const prices = landingPricing.packages.map((p) => p.price).join(" ");
    expect(prices).not.toContain("/mes");
    expect(prices).not.toContain("$390.000");
  });

  it("frames the web line as a one-time service (sin mensualidades)", () => {
    expect(landingPricing.footerText).toMatch(/pago único/i);
    expect(landingPricing.footerText).toMatch(/sin mensualidades/i);
    expect(landingPricing.footerText).not.toMatch(/por mes/i);
  });
});

describe("automation cross-sell — clear path back to the primary line", () => {
  it("links the primary CTA to the WhatsApp automation home (/)", () => {
    expect(landingAutomation.primary.href).toBe("/");
    expect(landingAutomation.primary.ctaLabel).toMatch(/automatización/i);
  });

  it("offers a secondary path to the plans section", () => {
    expect(landingAutomation.secondary.href).toBe("/#planes");
  });

  it("does not confuse the two product lines (web stays one-time)", () => {
    expect(landingAutomation.description).toMatch(/servicio principal/i);
  });
});