import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";

/**
 * T5 — the tenant Editar form must show ONLY business-card fields for client
 * (name, timezone, locale, notes): no plan selector (already superadmin-only)
 * and no business-profile section (backend rejects it for client with 403).
 * Superadmin keeps plan + business profile.
 */

const mocks = vi.hoisted(() => ({
  authUser: {
    id: "u-1",
    email: "u@test.com",
    name: "User",
    role: "superadmin",
    current_role: "superadmin",
  } as Record<string, unknown>,
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: mocks.authUser }),
}));

import { TenantForm } from "@/app/dashboard/tenants/components/tenant-form";

function renderToHtml(element: React.ReactElement): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const { pipe } = renderToPipeableStream(element, {
      onError: reject,
      onAllReady: () => {
        const sink = new PassThrough();
        sink.on("data", (chunk: Buffer) => chunks.push(chunk));
        sink.on("end", () =>
          resolve(Buffer.concat(chunks).toString("utf8")),
        );
        sink.on("error", reject);
        pipe(sink);
      },
    });
  });
}

function renderForm(role: "superadmin" | "admin" | "client"): Promise<string> {
  mocks.authUser.current_role = role;
  mocks.authUser.role = role;
  return renderToHtml(
    React.createElement(TenantForm, {
      defaultValues: {
        name: "Panadería Don José",
        plan: "professional",
        timezone: "America/Bogota",
        locale: "es-CO",
        notes: "Nota",
      },
      onSubmit: async () => {},
      isSubmitting: false,
      mode: "edit",
    }),
  );
}

describe("TenantForm — business-card fields only for client (T5)", () => {
  it("client sees name/timezone/locale/notes but no plan selector", async () => {
    const html = await renderForm("client");

    expect(html).toContain("Nombre del negocio");
    expect(html).toContain("Zona horaria");
    expect(html).toContain("Idioma / Región");
    expect(html).toContain("Notas");
    expect(html).not.toContain("Plan");
    expect(html).not.toContain('id="plan"');
  });

  it("client never sees the business-profile section (backend rejects it)", async () => {
    const html = await renderForm("client");

    expect(html).not.toContain("Perfil de negocio");
    expect(html).not.toContain("Nombre comercial");
  });

  it("admin keeps the form but still no plan selector", async () => {
    const html = await renderForm("admin");

    expect(html).toContain("Nombre del negocio");
    expect(html).not.toContain('id="plan"');
    // admin CAN edit business_profile (backend allows it) — keep it visible
    expect(html).toContain("Perfil de negocio");
  });

  it("superadmin sees plan selector and business profile", async () => {
    const html = await renderForm("superadmin");

    expect(html).toContain('id="plan"');
    expect(html).toContain("Plan");
    expect(html).toContain("Perfil de negocio");
  });
});