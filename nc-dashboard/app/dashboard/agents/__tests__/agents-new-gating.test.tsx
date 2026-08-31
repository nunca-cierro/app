import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";

/**
 * T3 — agents/new has NO role gate today; it must render only for
 * admin/superadmin. Client gets the AccessDeniedCard instead of the create
 * flow. Vitest environment is node → react-dom/server rendering.
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

vi.mock("@/hooks/use-agents", () => ({
  useAgents: () => ({
    agents: [],
    isLoading: false,
    error: null,
    createAgent: vi.fn(),
    createAgentFromTemplate: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-agent-templates", () => ({
  useAgentTemplates: () => ({
    templates: [],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/use-tenants", () => ({
  useTenants: () => ({
    tenants: [],
    isLoading: false,
    error: null,
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import NewAgentPage from "@/app/dashboard/agents/new/page";

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

function setupRole(role: "superadmin" | "admin" | "client") {
  mocks.authUser.current_role = role;
  mocks.authUser.role = role;
}

describe("agents/new — create flow gated to admin/superadmin (T3)", () => {
  it("client sees a no-access card, never the create flow", async () => {
    setupRole("client");
    const html = await renderToHtml(React.createElement(NewAgentPage));

    expect(html).toContain(NO_ACCESS);
    expect(html).not.toContain("Nuevo Agente");
    expect(html).not.toContain("Plantilla de configuración");
  });

  it("admin sees the full create flow", async () => {
    setupRole("admin");
    const html = await renderToHtml(React.createElement(NewAgentPage));

    expect(html).toContain("Nuevo Agente");
    expect(html).toContain("Plantilla de configuración");
    expect(html).toContain("Personalizado");
    expect(html).not.toContain(NO_ACCESS);
  });
});