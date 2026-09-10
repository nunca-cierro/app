import { describe, expect, it } from "vitest";
import { sitePlans } from "@/data/site";

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