import { describe, expect, it } from "vitest";
import {
  siteMetadata,
  sitePlans,
  siteFaq,
  siteHero,
  siteContact,
  siteWebSecondary,
  headerData,
  footerData,
} from "@/data/site";
import { planTerms, findPlanTerm } from "@/data/plan-terms";

/**
 * Slice 4 — landing coherence (plan-differentiation, task 4.5).
 *
 * The SaaS plan catalog in `data/site.ts` must reflect reality:
 * - Escenario A prices (copy strings, "+ IVA", nothing below $390.000)
 * - the FALSE "Empresarial: Editar + agregar" client-access row is fixed
 *   to "Solo lectura" (clients are read-only on ANY plan, backend
 *   CLIENT_VIEW_ONLY)
 * - planInfo does not promise per-plan AI models the code doesn't grant
 *   (the backend uses a single GROQ_MODEL) nor IA on Básico (no CAP_AI)
 * - the trial stays programmed-only (no AI)
 */

describe("sitePlans comparisonRows", () => {
  it("fixes the FALSE client-access row — enterprise is read-only, not editable", () => {
    const row = sitePlans.comparisonRows.find((r) => r.label === "Acceso cliente");
    expect(row).toBeDefined();
    expect(row?.enterprise).toBe("Solo lectura");
    expect(row?.enterprise).not.toBe("Editar + agregar");
  });

  it("shows Escenario A prices in the comparison table", () => {
    const row = sitePlans.comparisonRows.find((r) => r.label === "Precio");
    expect(row).toBeDefined();
    expect(row?.basic).toBe("Desde $390.000/mes + IVA");
    expect(row?.pro).toBe("Desde $790.000/mes + IVA");
    expect(row?.enterprise).toBe("Desde $1.590.000/mes + IVA");
  });
});

describe("sitePlans packages (Escenario A)", () => {
  it("prices every paid package with the Escenario A copy", () => {
    const byName = Object.fromEntries(
      sitePlans.packages.map((p) => [p.name, p.price]),
    );
    expect(byName["Básico"]).toBe("Desde $390.000/mes + IVA");
    expect(byName["Profesional"]).toBe("Desde $790.000/mes + IVA");
    expect(byName["Empresarial"]).toBe("Desde $1.590.000/mes + IVA");
  });

  it("includes the marketing-only Corporativo package labeled 'A cotizar'", () => {
    const corporate = sitePlans.packages.find((p) => p.name === "Corporativo");
    expect(corporate).toBeDefined();
    expect(corporate?.price).toBe("A cotizar");
    expect(corporate?.features).toContain("Proyectos desde ~$3.500.000/mes + IVA");
  });

  it("never drops the '+ IVA' framing on a paid tier", () => {
    for (const pack of sitePlans.packages) {
      if (pack.price === "A cotizar") continue;
      expect(pack.price.startsWith("Desde ")).toBe(true);
      expect(pack.price).toContain("+ IVA");
    }
  });

  it("promises no IA on the Básico package copy", () => {
    const basic = sitePlans.packages.find((p) => p.name === "Básico");
    const hasAI = basic?.features.some((f) => /inteligencia artificial|ia\b/i.test(f));
    expect(hasAI).toBe(false);
  });
});

describe("sitePlans planInfo (no false promises)", () => {
  it("keeps hasAI false on Básico (no CAP_AI in the backend)", () => {
    expect(sitePlans.planInfo.basic.hasAI).toBe(false);
    expect(sitePlans.planInfo.basic.type).toBe("programmed");
  });

  it("does NOT promise a per-plan AI model the code doesn't grant", () => {
    // The backend runs a single GROQ_MODEL — there is no per-plan model.
    expect(sitePlans.planInfo.professional).not.toHaveProperty("model");
    expect(sitePlans.planInfo.enterprise).not.toHaveProperty("model");
  });

  it("marks enterprise client access as read-only (clients never edit)", () => {
    expect(sitePlans.planInfo.enterprise.clientAccessType).toBe("read");
    expect(sitePlans.planInfo.professional.clientAccessType).toBe("read");
  });
});

describe("sitePlans trialInfo (programmed-only)", () => {
  it("describes a programmed FAQ trial without AI", () => {
    expect(sitePlans.trialInfo.type).toBe("programmed");
    expect(sitePlans.trialInfo.days).toBe(7);
    expect(sitePlans.trialInfo.description).toContain("programadas");
    expect(sitePlans.trialInfo.description).not.toMatch(/inteligencia artificial/i);
  });
});

describe("anti-undercut floor (sitePlans)", () => {
  it("has no SaaS price below $390.000 in the catalog", () => {
    const priceStrings = sitePlans.packages
      .map((p) => p.price)
      .concat(
        sitePlans.comparisonRows
          .filter((r) => r.label === "Precio")
          .flatMap((r) => [r.basic, r.pro, r.enterprise]),
      );
    for (const price of priceStrings) {
      if (price === "A cotizar") continue;
      // "$X" amount in the label must never be below 390000 (COP, dot-separated).
      const match = price.match(/\$(\d[\d.]*)/);
      if (match) {
        const amount = Number(match[1].replace(/\./g, ""));
        expect(amount).toBeGreaterThanOrEqual(390000);
      }
    }
  });
});

// ── 2026-09 audit desajustes (landing swap follow-up) ──

describe("landing desajuste C — guarantee vs 7-day programmed trial", () => {
  it("aligns the guarantee to the real trial (7 días programado, sin IA)", () => {
    expect(sitePlans.guaranteeText).toContain("7 días");
    expect(sitePlans.guaranteeText).not.toMatch(/primer mes/);
    expect(sitePlans.guaranteeText).not.toMatch(/sin riesgo/);
  });

  it("adds the honest 'sin inteligencia artificial' qualifier (matches /precios trialNote)", () => {
    expect(sitePlans.guaranteeText).toMatch(/sin inteligencia artificial/);
    expect(sitePlans.guaranteeText).toMatch(/programadas/);
  });
});

describe("landing desajuste D — FAQ claims match plan capabilities", () => {
  it("gates IA to Profesional+ in the FAQ (no AI on all plans)", () => {
    const faq = siteFaq.items.find((f) =>
      f.question.includes("¿El bot entiende lo que los clientes preguntan?"),
    );
    expect(faq).toBeDefined();
    expect(faq?.answer).toMatch(
      /A partir del plan Profesional[^.]*inteligencia artificial/,
    );
  });

  it("says weekly metrics exist on every plan and live dashboard from Profesional", () => {
    const faq = siteFaq.items.find((f) =>
      f.question.includes("¿Cómo sé cuántos clientes me contactaron?"),
    );
    expect(faq).toBeDefined();
    expect(faq?.answer).toContain("Todos los planes incluyen métricas semanales");
    expect(faq?.answer).toContain("A partir del plan Profesional");
  });

  it("removes the stale 'sitio web' reference from the setup-time answer", () => {
    const faq = siteFaq.items.find((f) =>
      f.question.includes("¿Cuánto tiempo toma tenerlo listo?"),
    );
    expect(faq).toBeDefined();
    expect(faq?.answer).not.toMatch(/sitio web/i);
  });
});

describe("landing desajuste E — no unbacked enterprise promises", () => {
  it("Empresarial no longer promises a response-time SLA", () => {
    const enterprise = sitePlans.packages.find((p) => p.name === "Empresarial");
    const joined = enterprise?.features.join(" ");
    expect(joined).not.toMatch(/garantizad|garantía/i);
    expect(joined).not.toMatch(/tiempo de respuesta/i);
  });

  it("softens integrations to an advisory phrasing", () => {
    const enterprise = sitePlans.packages.find((p) => p.name === "Empresarial");
    const joined = enterprise?.features.join(" ");
    expect(joined).toContain("Asesoría para conectar con sus sistemas");
    expect(joined).not.toMatch(/integrar con tus sistemas/i);
  });
});

describe("landing desajuste F — no 'API oficial de Meta' claim", () => {
  it("does not claim the official Meta API anywhere in the FAQ", () => {
    const allAnswers = siteFaq.items.map((f) => f.answer).join(" ");
    expect(allAnswers).not.toMatch(/API oficial/i);
    expect(allAnswers).not.toMatch(/Cloud API/i);
    expect(allAnswers).not.toMatch(/API de Meta/i);
  });
});

describe("anti-barrio tone on the home plans copy", () => {
  it("Básico description drops 'negocios pequeños'", () => {
    const basic = sitePlans.packages.find((p) => p.name === "Básico");
    expect(basic?.description).not.toMatch(/negocios pequeños/);
  });
});

// ── HOME SWAP — WhatsApp automation is the PRIMARY offer; web is secondary ──

describe("home swap — nav leads with the automation home", () => {
  it("header nav has the automation home ('WhatsApp' → '/') as the primary item", () => {
    expect(headerData.navItems[0]).toEqual({ name: "WhatsApp", href: "/" });
  });

  it("web design appears as a secondary nav item pointing to /inicio", () => {
    const web = headerData.navItems.find((i) => i.name === "Sitios web");
    expect(web).toEqual({ name: "Sitios web", href: "/inicio" });
  });

  it("footer nav also leads with the automation home", () => {
    expect(footerData.navItems[0]).toEqual({ name: "WhatsApp", href: "/" });
  });
});

describe("home swap — web product is positioned as an add-on", () => {
  it("the secondary strip links to /inicio with the 'Sitios web' label", () => {
    expect(siteWebSecondary.label).toBe("Sitios web");
    expect(siteWebSecondary.href).toBe("/inicio");
    expect(siteWebSecondary.ctaLabel).toMatch(/sitios web/i);
  });

  it("describes the web service as separate, one-time, not part of the SaaS", () => {
    expect(siteWebSecondary.description).toContain("Servicio aparte");
    expect(siteWebSecondary.description).toContain("Desde $699.900");
  });
});

describe("home swap — hero copy leads with automation, not web", () => {
  it("the home hero is automation-first (WhatsApp, 24/7)", () => {
    expect(siteHero.title).toMatch(/clientes|atendidos/i);
    expect(siteHero.subtitle).toMatch(/whatsapp/i);
    expect(siteHero.subtitle).toMatch(/24\/7/);
    expect(siteHero.subtitle).not.toMatch(/sitio web|página web/i);
  });
});

// ── HERO SEO (2026-09 audit) ──

describe("hero SEO — keyword-strong H1 with brand eyebrow", () => {
  it("sets the keyword-strong H1 on WhatsApp 24/7 for clientes", () => {
    expect(siteHero.title).toMatch(/WhatsApp 24\/7/);
    expect(siteHero.title).toMatch(/clientes/i);
  });

  it("moves the brand line 'nunca cierra' to the eyebrow kicker", () => {
    expect(siteHero.eyebrow).toBe("Su negocio nunca cierra");
    expect(siteHero.title).not.toMatch(/nunca cierra/i);
  });
});

describe("siteMetadata — no barrio framing, empresa keywords", () => {
  it("describes the 24/7 bot for empresas with the 7-day free trial", () => {
    expect(siteMetadata.description).toContain("empresas en Colombia");
    expect(siteMetadata.description).toContain("24/7");
    expect(siteMetadata.description).toContain("7 días de prueba gratis");
    expect(siteMetadata.description).not.toMatch(/barberías|tiendas/i);
    expect(siteMetadata.description).not.toMatch(/pequeña empresa/i);
  });

  it("keywords target empresas (not pequeña empresa)", () => {
    expect(siteMetadata.keywords).toContain("bot WhatsApp empresas Colombia");
    expect(siteMetadata.keywords).toContain("IA WhatsApp negocio");
    expect(siteMetadata.keywords).not.toMatch(/pequeña empresa/i);
  });
});

// ── REGISTER — usted (Colombian neutral, NO voseo) ──
// The audit found a tú/usted mix. Every user-facing string must use usted.

const userFacingTexts = [
  siteMetadata.description,
  siteHero.eyebrow,
  siteHero.title,
  siteHero.subtitle,
  sitePlans.title,
  sitePlans.subtitle,
  sitePlans.guaranteeText,
  sitePlans.advisoryCta.title,
  sitePlans.advisoryCta.description,
  ...siteFaq.items.flatMap((f) => [f.question, f.answer]),
  siteContact.title,
  siteContact.subtitle,
  siteContact.quickResponseText,
  siteContact.confidenceText,
  ...siteContact.quoteChecklist.items.map((i) => i.text),
];

describe("register — no tú/vos pronouns in user-facing copy", () => {
  it("uses usted forms everywhere in data/site.ts", () => {
    for (const text of userFacingTexts) {
      expect(text).not.toMatch(/\b(tú|tus|tu|te|ti|contigo|tuyo|tuya)\b/i);
    }
  });

  it("FAQ #8 lists premium verticals first", () => {
    const faq = siteFaq.items.find((f) =>
      f.question.includes("¿Funciona para cualquier tipo de negocio?"),
    );
    expect(faq).toBeDefined();
    expect(faq?.answer).toContain("restaurantes, clínicas, concesionarios, inmobiliarias, hoteles, gimnasios y spas");
    expect(faq?.answer).not.toMatch(/barberías, tiendas/);
  });
});

// ── PLAN TERMS — tooltip coverage (clarifying explanations) ──

describe("plan-terms — tooltip coverage", () => {
  it("maps every comparison-row label to a term", () => {
    for (const row of sitePlans.comparisonRows) {
      const term = findPlanTerm(row.label);
      expect(term, `comparison label '${row.label}' lacks a term`).toBeDefined();
      expect(term!.explanation.length).toBeGreaterThan(10);
    }
  });

  it("maps every package feature to a term", () => {
    const features = sitePlans.packages.flatMap((p) => p.features);
    for (const feature of features) {
      const term = findPlanTerm(feature);
      expect(term, `package feature '${feature}' lacks a term`).toBeDefined();
      expect(term!.explanation.length).toBeGreaterThan(10);
    }
  });

  it("keeps explanations in the usted register (no tú/vos)", () => {
    for (const term of planTerms) {
      expect(term.explanation).not.toMatch(
        /\b(tú|tus|tu|te|ti|contigo|tuyo|tuya)\b/i,
      );
    }
  });

  it("gives the FAQ 'Panel en vivo' wording a term", () => {
    const term = findPlanTerm("panel en vivo");
    expect(term).toBeDefined();
  });
});