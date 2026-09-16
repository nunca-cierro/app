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
 * - EVERY plan carries AI (backend CAP_AI): trial 500 / Básico 2.000 /
 *   Profesional 10.000 / Empresarial ilimitado; planInfo does not promise
 *   per-plan AI models the code doesn't grant (single GROQ_MODEL)
 * - the trial is 3 días CON IA (soft cap 500 respuestas IA)
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

  it("shows the AI response caps with estimated conversations (÷4, ~)", () => {
    const row = sitePlans.comparisonRows.find(
      (r) => r.label === "Respuestas con IA al mes",
    );
    expect(row).toBeDefined();
    expect(row?.basic).toBe("Hasta 2.000 (~500 conversaciones)");
    expect(row?.pro).toBe("10.000 (~2.500 conversaciones)");
    expect(row?.enterprise).toBe("Ilimitadas");
    expect(sitePlans.estimateNote).toContain("~4 mensajes por conversación");
  });

  it("drops the Tipo de respuestas and Respuestas programadas (FAQ) rows (noise)", () => {
    expect(
      sitePlans.comparisonRows.some((r) => r.label === "Tipo de respuestas"),
    ).toBe(false);
    expect(
      sitePlans.comparisonRows.some(
        (r) => r.label === "Respuestas programadas (FAQ)",
      ),
    ).toBe(false);
  });

  it("breaks out WhatsApp numbers as an indexable row (Profesional: hasta 5)", () => {
    const row = sitePlans.comparisonRows.find(
      (r) => r.label === "Números de WhatsApp",
    );
    expect(row).toBeDefined();
    expect(row?.basic).toBe("1");
    expect(row?.pro).toBe("Hasta 5");
    expect(row?.enterprise).toBe("Ilimitados");
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

  it("never drops the '+ IVA' framing on a paid tier", () => {
    for (const pack of sitePlans.packages) {
      if (pack.price === "A cotizar") continue;
      expect(pack.price.startsWith("Desde ")).toBe(true);
      expect(pack.price).toContain("+ IVA");
    }
  });

  it("promises IA on the Básico package copy (soft 2.000 cap)", () => {
    const basic = sitePlans.packages.find((p) => p.name === "Básico");
    const hasAI = basic?.features.some((f) =>
      /inteligencia artificial|ia\b/i.test(f),
    );
    expect(hasAI).toBe(true);
    expect(basic?.features).toContain("Hasta 2.000 respuestas con IA al mes");
  });
});

describe("sitePlans planInfo (no false promises)", () => {
  it("marks hasAI true on Básico (CAP_AI granted to every plan)", () => {
    expect(sitePlans.planInfo.basic.hasAI).toBe(true);
    expect(sitePlans.planInfo.basic.type).toBe("ai");
    expect(sitePlans.planInfo.basic.maxConversations).toBe(2000);
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

describe("sitePlans trialInfo (3 días con IA)", () => {
  it("describes a 3-day trial WITH AI (soft cap 500 respuestas IA)", () => {
    expect(sitePlans.trialInfo.type).toBe("ai");
    expect(sitePlans.trialInfo.days).toBe(3);
    expect(sitePlans.trialInfo.description).toContain("3 días");
    expect(sitePlans.trialInfo.description).toContain("500 respuestas IA");
    expect(sitePlans.trialInfo.description).toMatch(/IA\b/i);
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

describe("landing desajuste C — guarantee matches the real 3-day trial WITH IA", () => {
  it("aligns the guarantee to the real trial (3 días con IA, 500 respuestas)", () => {
    expect(sitePlans.guaranteeText).toContain("3 días");
    expect(sitePlans.guaranteeText).toContain("500 respuestas IA");
    expect(sitePlans.guaranteeText).not.toMatch(/primer mes/);
    expect(sitePlans.guaranteeText).not.toMatch(/sin riesgo/);
  });

  it("no longer claims the trial is programmed-only (sin IA)", () => {
    expect(sitePlans.guaranteeText).not.toMatch(/sin inteligencia artificial/);
    expect(sitePlans.guaranteeText).toMatch(/IA/i);
  });

  it("explains the AI cap unit and the FAQ downgrade under the plan table", () => {
    expect(sitePlans.quotaNote).toBe(
      "1 respuesta con IA = 1 mensaje generado por IA. Al agotar tu cupo mensual, el bot continúa atendiendo con respuestas programadas (FAQ) para que no pierdas clientes. Las escalaciones a un asesor no consumen tu cupo.",
    );
  });
});

describe("landing desajuste D — FAQ claims match plan capabilities", () => {
  it("states AI is included in ALL plans in the FAQ", () => {
    const faq = siteFaq.items.find((f) =>
      f.question.includes("¿El bot entiende lo que los clientes preguntan?"),
    );
    expect(faq).toBeDefined();
    expect(faq?.answer).toMatch(/todos los planes[^.]*inteligencia artificial/i);
    expect(faq?.answer).not.toMatch(/A partir del plan Profesional/);
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
    expect(joined).toContain("Asesoría para conectar con tus sistemas");
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
    expect(siteHero.eyebrow).toBe("Tu negocio nunca cierra");
    expect(siteHero.title).not.toMatch(/nunca cierra/i);
  });
});

describe("siteMetadata — no barrio framing, empresa keywords", () => {
  it("describes the 24/7 bot for empresas with the 3-day AI trial", () => {
    expect(siteMetadata.description).toContain("empresas en Colombia");
    expect(siteMetadata.description).toContain("24/7");
    expect(siteMetadata.description).toContain("3 días de prueba gratis con IA");
    expect(siteMetadata.description).not.toMatch(/barberías|tiendas/i);
    expect(siteMetadata.description).not.toMatch(/pequeña empresa/i);
  });

  it("keywords target empresas (not pequeña empresa)", () => {
    expect(siteMetadata.keywords).toContain("bot WhatsApp empresas Colombia");
    expect(siteMetadata.keywords).toContain("IA WhatsApp negocio");
    expect(siteMetadata.keywords).not.toMatch(/pequeña empresa/i);
  });
});

// ── REGISTER — tuteo (owner-confirmed full tuteo, NO voseo, NO usted) ──
// Every user-facing string addresses the reader with "tú". No voseo and no
// "usted". A third-person "su" (e.g. "los negocios… su atención") is fine;
// a "su/sus/le" addressing the reader is a register regression.

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

const ustedPattern =
  /(usted|ustedes|déjeme|cuéntenos|escríbanos|contáctenos|Elija|Cancele|Agende una|su negocio|su empresa|sus clientes|su WhatsApp|su sitio|su plan|su bot|su equipo|le orientamos|le mostramos|le recomendamos|le gustaría|le conviene|le mantenemos|le ayudamos|le respondemos|le acompañamos|tenés|querés|podés|volvé|mirá|dale|tranqui|al toque)/i;

describe("register — tuteo (Colombian neutral, NO voseo, NO usted)", () => {
  it("uses tú (tuteo) forms everywhere in data/site.ts", () => {
    for (const text of userFacingTexts) {
      expect(text).not.toMatch(ustedPattern);
    }
  });

  it("addresses the reader with tú in the key sections", () => {
    expect(siteHero.eyebrow).toMatch(/Tu negocio/);
    expect(siteHero.title).toMatch(/tus clientes/);
    expect(sitePlans.title).toMatch(/tu negocio/);
    expect(siteContact.title).toMatch(/tu negocio/);
    expect(siteContact.confidenceText).toMatch(/te orientamos/);
    const customFaq = siteFaq.items.find((f) =>
      f.question.includes("¿Puedo personalizar las respuestas?"),
    );
    expect(customFaq?.answer).toMatch(/tú defines/);
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

  it("keeps explanations in the tuteo register (no usted, no voseo)", () => {
    for (const term of planTerms) {
      expect(term.explanation).not.toMatch(
        /(usted|ustedes|déjeme|cuéntenos|escríbanos|contáctenos|Elija|Cancele|Agende|su negocio|sus canales|su plan|su bot|su cliente|su equipo|sus sistemas|su operación|le acompañamos|le orientamos|le mostramos|le recomendamos|tenés|querés|podés|volvé|mirá|dale|tranqui|al toque)/i,
      );
    }
  });

  it("gives the FAQ 'Panel en vivo' wording a term", () => {
    const term = findPlanTerm("panel en vivo");
    expect(term).toBeDefined();
  });
});