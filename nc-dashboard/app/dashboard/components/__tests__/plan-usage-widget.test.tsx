import { describe, expect, it } from "vitest";
import * as React from "react";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import {
  PlanUsageWidget,
  usageWidgetState,
  shouldShowUpgradeCta,
  usageBarWidth,
  formatUsageLimit,
} from "@/app/dashboard/components/plan-usage-widget";
import type { PlanUsage } from "@/lib/types";

/**
 * Slice 3 — plan usage widget (plan-differentiation, task 3.4).
 *
 * Vitest environment is node (no jsdom) → the widget renders with
 * react-dom/server (pattern: dashboard-quick-actions.test.tsx). The
 * widget is presentational (data via props) so SSR proves the exact
 * states: bar width/aria reflect pct, CTA appears at >=80%, over-limit
 * state >100%, enterprise (pct null) shows "Ilimitado" without a bar,
 * and API errors hide the widget (graceful degradation).
 *
 * The threshold/state logic is extracted to pure functions and tested
 * directly (extract-before-mock).
 */

function makeUsage(
  pct: number | null,
  overLimit = false,
  plan = "professional",
): PlanUsage {
  return {
    plan,
    limits: {
      max_agents: 5,
      max_products: 50,
      max_conversations_per_month: 5000,
      max_businesses: 3,
    },
    usage: { ai_responses: 1200, products: 12, businesses: 2 },
    pct,
    over_limit: overLimit,
  };
}

/**
 * React 19 SSR separates adjacent text nodes with `<!-- -->` comments
 * (e.g. `105<!-- -->%`). They are a serialization artifact, invisible in
 * the browser — strip them so text assertions check user-visible content.
 */
function stripSsrComments(html: string): string {
  return html.replace(/<!-- -->/g, "");
}

function renderWidget(props: {
  data?: PlanUsage | null;
  isLoading?: boolean;
  error?: string | null;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const { pipe } = renderToPipeableStream(
      React.createElement(PlanUsageWidget, {
        data: props.data ?? null,
        isLoading: props.isLoading ?? false,
        error: props.error ?? null,
      }),
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

/* ------------------------------------------------------------------ */
/*  Pure state resolution                                              */
/* ------------------------------------------------------------------ */

describe("usageWidgetState", () => {
  it("hides the widget on API error (graceful degradation)", () => {
    expect(usageWidgetState(null, false, "Error")).toBe("hidden");
    expect(usageWidgetState(makeUsage(24), false, "Error")).toBe("hidden");
  });

  it("shows a loading state while fetching without data", () => {
    expect(usageWidgetState(null, true, null)).toBe("loading");
  });

  it("stays idle without data and not loading (no active tenant)", () => {
    expect(usageWidgetState(null, false, null)).toBe("idle");
  });

  it("treats pct null (enterprise) as unlimited", () => {
    expect(usageWidgetState(makeUsage(null), false, null)).toBe("unlimited");
  });

  it("marks over-limit state above 100%", () => {
    expect(usageWidgetState(makeUsage(105), false, null)).toBe("over");
  });

  it("warns (CTA) at or above 80%", () => {
    expect(usageWidgetState(makeUsage(80), false, null)).toBe("warning");
    expect(usageWidgetState(makeUsage(100), false, null)).toBe("warning");
  });

  it("is normal below 80%", () => {
    expect(usageWidgetState(makeUsage(24), false, null)).toBe("normal");
    expect(usageWidgetState(makeUsage(79), false, null)).toBe("normal");
  });
});

describe("shouldShowUpgradeCta", () => {
  it("hides the CTA below 80%", () => {
    expect(shouldShowUpgradeCta(24, "professional")).toBe(false);
    expect(shouldShowUpgradeCta(79, "professional")).toBe(false);
  });

  it("shows the CTA at 80% and above for non-enterprise plans", () => {
    expect(shouldShowUpgradeCta(80, "professional")).toBe(true);
    expect(shouldShowUpgradeCta(100, "professional")).toBe(true);
    expect(shouldShowUpgradeCta(105, "professional")).toBe(true);
  });

  it("never shows the CTA for unlimited plans (pct null)", () => {
    expect(shouldShowUpgradeCta(null, "professional")).toBe(false);
  });

  it("never shows the CTA for enterprise at any pct (top plan, no self-service upgrade)", () => {
    expect(shouldShowUpgradeCta(80, "enterprise")).toBe(false);
    expect(shouldShowUpgradeCta(90, "enterprise")).toBe(false);
    expect(shouldShowUpgradeCta(105, "enterprise")).toBe(false);
  });
});

describe("usageBarWidth", () => {
  it("passes through values within range", () => {
    expect(usageBarWidth(24)).toBe(24);
    expect(usageBarWidth(80)).toBe(80);
    expect(usageBarWidth(0)).toBe(0);
  });

  it("clamps the bar to 100% when over the limit", () => {
    expect(usageBarWidth(105)).toBe(100);
    expect(usageBarWidth(150)).toBe(100);
  });
});

describe("formatUsageLimit", () => {
  it("formats a numeric limit with es-CO separators", () => {
    expect(formatUsageLimit(5000)).toBe("5.000");
    expect(formatUsageLimit(100)).toBe("100");
  });

  it("labels a null limit as unlimited", () => {
    expect(formatUsageLimit(null)).toBe("Ilimitado");
  });
});

/* ------------------------------------------------------------------ */
/*  Rendered behavior (SSR)                                            */
/* ------------------------------------------------------------------ */

describe("PlanUsageWidget rendered states", () => {
  it("renders a 24% bar without any CTA (WidgetProgress)", async () => {
    const html = await renderWidget({ data: makeUsage(24) });

    expect(html).toContain("Uso de tu plan");
    expect(html).toContain('aria-valuenow="24"');
    expect(html).toContain("width:24%");
    expect(html).toContain("24%");
    expect(html).not.toContain("Mejorar plan");
  });

  it("renders the upgrade CTA at 90% usage", async () => {
    const html = await renderWidget({ data: makeUsage(90) });

    expect(html).toContain('aria-valuenow="90"');
    expect(html).toContain("Mejorar plan");
  });

  it("renders the over-limit state with CTA above 100% (WidgetOverLimitCta)", async () => {
    const html = await renderWidget({ data: makeUsage(105, true) });

    expect(html).toContain("Superaste el cupo mensual de respuestas IA");
    expect(html).toContain("Mejorar plan");
    // Bar clamped to 100% while the label keeps the real 105%.
    expect(html).toContain("width:100%");
    expect(html).toContain('aria-valuenow="100"');
    expect(html).toContain("105%");
  });

  it("renders 'Ilimitado' without a bar for a pct-null plan (defensive branch)", async () => {
    const html = await renderWidget({ data: makeUsage(null, false, "enterprise") });

    expect(html).toContain("Ilimitado");
    expect(html).not.toContain("progressbar");
    expect(html).not.toContain("Mejorar plan");
  });

  it("renders the enterprise bar WITHOUT the upgrade CTA at 90% (EnterpriseBarWithoutUpgradeCta)", async () => {
    const html = await renderWidget({ data: makeUsage(90, false, "enterprise") });

    expect(html).toContain('aria-valuenow="90"');
    expect(html).toContain("90%");
    expect(html).not.toContain("Mejorar plan");
  });

  it("renders the enterprise over state informatively WITHOUT CTA (EnterpriseOverInformsWithoutCta)", async () => {
    const html = await renderWidget({ data: makeUsage(105, true, "enterprise") });

    expect(html).toContain("Superaste el cupo mensual de respuestas IA");
    expect(html).toContain("105%");
    expect(html).toContain('aria-valuenow="100"');
    expect(html).not.toContain("Mejorar plan");
  });

  it("hides the widget entirely on API error (WidgetApiErrorGraceful)", async () => {
    const html = await renderWidget({ data: null, error: "Error de red" });

    expect(html).toBe("");
  });

  it("stays hidden when idle (no data, no loading, no error)", async () => {
    const html = await renderWidget({ data: null });

    expect(html).toBe("");
  });

  it("renders only the card shell while loading — no bar, no CTA", async () => {
    const html = await renderWidget({ data: null, isLoading: true });

    expect(html).toContain("Uso de tu plan");
    expect(html).not.toContain("progressbar");
    expect(html).not.toContain("Mejorar plan");
  });
});