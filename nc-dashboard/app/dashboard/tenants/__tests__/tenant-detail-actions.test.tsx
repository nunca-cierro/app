import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";

/**
 * The vitest environment is node (no jsdom), so components are rendered with
 * react-dom/server. Proves RV-5: the "Eliminar" button renders ONLY for
 * superadmin (backend DELETE is superadmin-only); "Editar" stays visible for
 * admin (PATCH is admin_or_super).
 */

const mocks = vi.hoisted(() => ({
  authUser: {
    id: "sa-1",
    email: "sa@test.com",
    name: "Súper Admin",
    role: "superadmin",
    current_role: "superadmin",
  } as Record<string, unknown>,
  useTenant: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "t1" }),
  useRouter: () => ({ replace: vi.fn() }),
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

vi.mock("@/hooks/use-tenant", () => ({
  useTenant: () => mocks.useTenant(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/app/dashboard/tenants/components/confirm-payment-dialog", () => ({
  ConfirmPaymentDialog: () => null,
}));

import TenantDetailPage from "@/app/dashboard/tenants/[id]/page";

function makeTenant() {
  return {
    id: "t1",
    name: "Panadería Don José",
    slug: "panaderia-don-jose",
    status: "active",
    plan: "professional",
    created_at: "2026-01-15T10:00:00Z",
    timezone: "America/Bogota",
    locale: "es",
    payment_status: "active",
    notes: null,
    plan_activated_at: "2026-01-16T10:00:00Z",
  };
}

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

function setupViewer(role: "superadmin" | "admin" | "client") {
  mocks.authUser.current_role = role;
  mocks.authUser.role = role;
  mocks.useTenant.mockReturnValue({
    tenant: makeTenant(),
    isLoading: false,
    error: null,
    updateTenant: vi.fn(),
    deleteTenant: vi.fn(),
    refetch: vi.fn(),
  });
}

describe("TenantDetailPage — Eliminar/Editar gating (RV-5)", () => {
  it("renders Eliminar and Editar for superadmin", async () => {
    setupViewer("superadmin");
    const html = await renderToHtml(React.createElement(TenantDetailPage));

    expect(html).toContain("Editar");
    expect(html).toContain("Eliminar");
  });

  it("hides Eliminar but keeps Editar for admin (RV-5 scenario)", async () => {
    setupViewer("admin");
    const html = await renderToHtml(React.createElement(TenantDetailPage));

    expect(html).toContain("Editar");
    expect(html).not.toContain("Eliminar");
  });

  it("hides Eliminar for client as well", async () => {
    setupViewer("client");
    const html = await renderToHtml(React.createElement(TenantDetailPage));

    expect(html).not.toContain("Eliminar");
  });
});