import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";

/**
 * tenants/new has no role gate today; a client WITH a tenant can reach it via
 * direct URL (prefix route match allows /dashboard/tenants/* for clients and
 * the layout effect does not redirect). It must render the create flow ONLY
 * for superadmin or a tenantless user (self-service onboarding) — any
 * tenantful client gets the AccessDeniedCard instead. Vitest environment is
 * node → react-dom/server rendering.
 */

const mocks = vi.hoisted(() => ({
  authUser: {
    id: "u-1",
    email: "u@test.com",
    name: "User",
    role: "client",
    current_role: "client",
    tenant_id: null,
    current_tenant_id: null,
  } as Record<string, unknown>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => React.createElement("a", { href, ...props }, children),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: mocks.authUser }),
}));

vi.mock("@/hooks/use-tenants", () => ({
  useTenants: () => ({
    tenants: [],
    isLoading: false,
    error: null,
    createTenant: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import NewTenantPage from "@/app/dashboard/tenants/new/page";

const NO_ACCESS = "No tenés permisos para esta acción";

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

function setupUser(overrides: Record<string, unknown>) {
  mocks.authUser.role = overrides.role ?? "client";
  mocks.authUser.current_role = overrides.current_role ?? "client";
  mocks.authUser.tenant_id = overrides.tenant_id ?? null;
  mocks.authUser.current_tenant_id = overrides.current_tenant_id ?? null;
}

describe("tenants/new — create flow gated to superadmin or tenantless (self-service onboarding)", () => {
  it("client WITH a tenant sees a no-access card, never the create flow", async () => {
    setupUser({
      role: "client",
      current_role: "client",
      tenant_id: "t-1",
      current_tenant_id: "t-1",
    });
    const html = await renderToHtml(React.createElement(NewTenantPage));

    expect(html).toContain(NO_ACCESS);
    expect(html).not.toContain("Nuevo Negocio");
    expect(html).not.toContain("Crear Negocio");
  });

  it("tenantless client sees the create flow (self-service onboarding)", async () => {
    setupUser({
      role: "client",
      current_role: "client",
      tenant_id: null,
      current_tenant_id: null,
    });
    const html = await renderToHtml(React.createElement(NewTenantPage));

    expect(html).toContain("Nuevo Negocio");
    expect(html).toContain("Crear Negocio");
    expect(html).not.toContain(NO_ACCESS);
  });

  it("superadmin sees the create flow", async () => {
    setupUser({
      role: "superadmin",
      current_role: "superadmin",
      tenant_id: null,
      current_tenant_id: null,
    });
    const html = await renderToHtml(React.createElement(NewTenantPage));

    expect(html).toContain("Nuevo Negocio");
    expect(html).toContain("Crear Negocio");
    expect(html).not.toContain(NO_ACCESS);
  });
});