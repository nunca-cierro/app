import { describe, expect, it } from "vitest";
import * as React from "react";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import { PLANS_CONFIG, PlanCard } from "@/app/dashboard/components/plan-card";

/**
 * Slice 4 — plan-card pricing (plan-differentiation, task 4.2).
 *
 * Escenario A (owner-validated): prices are pure copy strings
 * ("Desde $X/mes + IVA") — the `price: number` + `formatPrice` runtime
 * arithmetic was removed. Corporate is a marketing-only card: "A cotizar"
 * with a quote CTA, NEVER an "Activar" button (it is not payable).
 *
 * Vitest environment is node (no jsdom) → the card renders with
 * react-dom/server (repo pattern: plan-usage-widget.test.tsx).
 */

/**
 * React 19 SSR separates adjacent text nodes with `<!-- -->` comments.
 * Strip them so text assertions check user-visible content.
 */
function stripSsrComments(html: string): string {
  return html.replace(/<!-- -->/g, "");
}

function renderCard(plan: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const { pipe } = renderToPipeableStream(
      React.createElement(PlanCard, { plan, onSelect: () => {} }),
      {
        onError: (err) => reject(err),
        onAllReady: () => {
          const sink = new PassThrough();
          sink.on("data", (chunk: Buffer) => chunks.push(chunk));
          sink.on("end", () =>
            resolve(stripSsrComments(Buffer.concat(chunks).toString("utf8"))),
          );
          sink.on("error", reject);
          pipe(sink);
        },
      },
    );
  });
}

describe("PLANS_CONFIG (Escenario A)", () => {
  it("defines the three paid plans plus the marketing-only corporate card", () => {
    expect(Object.keys(PLANS_CONFIG)).toEqual([
      "basic",
      "professional",
      "enterprise",
      "corporate",
    ]);
  });

  it("has correct labels", () => {
    expect(PLANS_CONFIG.basic.label).toBe("Básico");
    expect(PLANS_CONFIG.professional.label).toBe("Profesional");
    expect(PLANS_CONFIG.enterprise.label).toBe("Empresarial");
    expect(PLANS_CONFIG.corporate.label).toBe("Corporativo");
  });

  it("shows the exact Escenario A price labels (copy, not arithmetic)", () => {
    expect(PLANS_CONFIG.basic.priceLabel).toBe("Desde $390.000/mes + IVA");
    expect(PLANS_CONFIG.professional.priceLabel).toBe("Desde $790.000/mes + IVA");
    expect(PLANS_CONFIG.enterprise.priceLabel).toBe("Desde $1.590.000/mes + IVA");
  });

  it("never drops the '+ IVA' framing on a paid tier", () => {
    for (const plan of ["basic", "professional", "enterprise"]) {
      expect(PLANS_CONFIG[plan].priceLabel.startsWith("Desde ")).toBe(true);
      expect(PLANS_CONFIG[plan].priceLabel).toContain("/mes + IVA");
    }
  });

  it("removed the numeric price field — no runtime price arithmetic", () => {
    for (const plan of Object.values(PLANS_CONFIG)) {
      expect(plan).not.toHaveProperty("price");
    }
  });

  it("marks corporate as quote-only with 'A cotizar' and a quote URL", () => {
    expect(PLANS_CONFIG.corporate.priceLabel).toBe("A cotizar");
    expect(PLANS_CONFIG.corporate.quoteOnly).toBe(true);
    expect(PLANS_CONFIG.corporate.quoteUrl).toMatch(/^https:\/\/wa\.me\//);
  });

  it("quotes the corporate reference in the canonized format (~$3.500.000)", () => {
    expect(PLANS_CONFIG.corporate.features).toContain(
      "Proyectos desde ~$3.500.000/mes + IVA",
    );
    expect(PLANS_CONFIG.corporate.features.join(" ")).not.toContain("~$3.5M");
  });

  it("keeps features for every card including corporate", () => {
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

describe("formatPrice removal", () => {
  it("no longer exports the runtime price formatter", async () => {
    const mod = await import("@/app/dashboard/components/plan-card");
    expect(mod).not.toHaveProperty("formatPrice");
  });
});

describe("PlanCard render (SSR)", () => {
  it("renders the Básico card with Escenario A price and Activar button", async () => {
    const html = await renderCard("basic");
    expect(html).toContain("Básico");
    expect(html).toContain("Desde $390.000/mes + IVA");
    expect(html).toContain("Activar");
    expect(html).not.toContain("$60.000");
  });

  it("renders the Empresarial card with Escenario A price", async () => {
    const html = await renderCard("enterprise");
    expect(html).toContain("Empresarial");
    expect(html).toContain("Desde $1.590.000/mes + IVA");
    expect(html).toContain("Activar");
  });

  it("renders the corporate card with 'A cotizar', a quote CTA and NO Activar button", async () => {
    const html = await renderCard("corporate");
    expect(html).toContain("Corporativo");
    expect(html).toContain("A cotizar");
    expect(html).toContain("Cotizar");
    expect(html).toContain("wa.me");
    expect(html).not.toContain("Activar");
  });
});