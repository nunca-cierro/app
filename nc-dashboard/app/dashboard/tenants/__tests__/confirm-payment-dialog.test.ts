import { describe, expect, it } from "vitest";
import * as React from "react";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import {
  ConfirmPaymentDialog,
  PLAN_OPTIONS,
} from "@/app/dashboard/tenants/components/confirm-payment-dialog";
import type { Tenant } from "@/lib/types";

/**
 * Slice 4 — admin payment confirmation amounts (plan-differentiation,
 * task 4.3). The stale $60K/$120K/$250K options are replaced with the
 * Escenario A price labels; corporate is NOT an option (it is a
 * marketing-only plan, never activatable by an admin).
 */

function stripSsrComments(html: string): string {
  return html.replace(/<!-- -->/g, "");
}

function renderDialog(tenant: Tenant): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const { pipe } = renderToPipeableStream(
      React.createElement(ConfirmPaymentDialog, { tenant, onSuccess: () => {} }),
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

function makeTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: "t1",
    name: "Mi Negocio",
    slug: "mi-negocio",
    plan: "basic",
    payment_status: "active",
    created_at: "2026-09-01T00:00:00Z",
    ...overrides,
  } as Tenant;
}

describe("PLAN_OPTIONS (Escenario A)", () => {
  it("offers exactly the three payable plans — no corporate", () => {
    expect(PLAN_OPTIONS.map((o) => o.value)).toEqual([
      "basic",
      "professional",
      "enterprise",
    ]);
  });

  it("shows the exact Escenario A price labels", () => {
    expect(PLAN_OPTIONS).toEqual([
      { value: "basic", label: "Básico", priceLabel: "Desde $390.000/mes + IVA" },
      {
        value: "professional",
        label: "Profesional",
        priceLabel: "Desde $790.000/mes + IVA",
      },
      {
        value: "enterprise",
        label: "Empresarial",
        priceLabel: "Desde $1.590.000/mes + IVA",
      },
    ]);
  });

  it("never drops the '+ IVA' framing on a paid tier", () => {
    for (const option of PLAN_OPTIONS) {
      expect(option.priceLabel.startsWith("Desde ")).toBe(true);
      expect(option.priceLabel).toContain("/mes + IVA");
    }
  });

  it("removed the numeric price field — no runtime price arithmetic", () => {
    for (const option of PLAN_OPTIONS) {
      expect(option).not.toHaveProperty("price");
    }
  });
});

describe("ConfirmPaymentDialog render (SSR)", () => {
  it("renders the confirmation trigger without error", async () => {
    // Radix DialogContent only renders once open → SSR shows the trigger.
    const html = await renderDialog(makeTenant());
    expect(html).toContain("Confirmar Pago");
  });
});