import { describe, expect, it } from "vitest";
import * as React from "react";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import {
  PaymentScreen,
  PLAN_QR_MAP,
  resolvePlanQr,
} from "@/app/dashboard/components/payment-screen";

/**
 * Slice 4 — payment flow gating (plan-differentiation, task 4.4).
 *
 * Corporate is a marketing-only plan: it MUST NOT appear in the QR /
 * payment flow. The QR map stays intact (basic/professional/enterprise),
 * and `resolvePlanQr` returns null for corporate so the screen shows a
 * quote card instead of a QR. The trial fallback (basic QR) is preserved.
 */

function stripSsrComments(html: string): string {
  return html.replace(/<!-- -->/g, "");
}

function renderScreen(planKey: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const { pipe } = renderToPipeableStream(
      React.createElement(PaymentScreen, { planKey, onBack: () => {} }),
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

describe("PLAN_QR_MAP", () => {
  it("maps exactly the three payable plans to QR images", () => {
    expect(Object.keys(PLAN_QR_MAP)).toEqual([
      "basic",
      "professional",
      "enterprise",
    ]);
  });

  it("does NOT contain corporate — it has no QR (marketing-only)", () => {
    expect(PLAN_QR_MAP.corporate).toBeUndefined();
    expect(Object.keys(PLAN_QR_MAP)).not.toContain("corporate");
  });
});

describe("resolvePlanQr", () => {
  it("resolves a QR for the payable plans", () => {
    expect(resolvePlanQr("basic")).toBe("/payment/QRBasico.jpeg");
    expect(resolvePlanQr("professional")).toBe("/payment/QRProfesional.jpeg");
    expect(resolvePlanQr("enterprise")).toBe("/payment/QREmpresarial.jpeg");
  });

  it("returns null for corporate — no QR in the payment flow", () => {
    expect(resolvePlanQr("corporate")).toBeNull();
  });

  it("keeps the trial fallback (basic QR) intact", () => {
    expect(resolvePlanQr("trial")).toBe("/payment/QRBasico.jpeg");
  });
});

describe("PaymentScreen render (SSR)", () => {
  it("renders a quote card for corporate — no QR, no payment methods", async () => {
    const html = await renderScreen("corporate");
    expect(html).toContain("Corporativo");
    expect(html).toContain("A cotizar");
    expect(html).not.toContain("Escanea este código QR");
    expect(html).not.toContain("QRBasico");
  });

  it("renders the payment header for a payable plan", async () => {
    const html = await renderScreen("basic");
    expect(html).toContain("Pagar Plan Básico");
  });
});