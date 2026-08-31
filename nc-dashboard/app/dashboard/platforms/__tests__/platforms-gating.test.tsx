import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";

/**
 * T2 — client sees platforms pages as READ-ONLY: every create/edit/delete/
 * connect/anti-spam/webhook control is hidden; admin/superadmin keep them.
 * Vitest environment is node (no jsdom) → pages render with react-dom/server.
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
  useParams: () => ({ id: "c1" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
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

vi.mock("@/hooks/use-platform-connections", () => ({
  usePlatformConnections: () => ({
    connections: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    createConnection: vi.fn(),
    fetchEvolutionInstances: vi.fn(),
  }),
  usePlatformConnection: () => ({
    connection: {
      id: "c1",
      tenant_id: "t1",
      platform_type: "evolution",
      display_name: "WhatsApp Principal",
      status: "active",
      extra_data: { connection_status: "disconnected" },
    },
    isLoading: false,
    error: null,
    updateConnection: vi.fn(),
    deleteConnection: vi.fn(),
    registerWebhook: vi.fn(),
    connectEvolution: vi.fn(),
    disconnectEvolution: vi.fn(),
    refetchConnection: vi.fn(),
    checkEvolutionState: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-whatsapp-numbers", () => ({
  useWhatsAppNumbers: () => ({
    numbers: [],
    isLoading: false,
    error: null,
    createNumber: vi.fn(),
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-whatsapp-number", () => ({
  useWhatsAppNumber: () => ({
    number: {
      id: "n1",
      tenant_id: "t1",
      phone_number_id: "p1",
      waba_id: "waba-1",
      display_phone_number: "+573001234567",
      verified_name: "Test",
      status: "active",
      is_primary: true,
      created_at: "2026-01-01T00:00:00Z",
    },
    isLoading: false,
    error: null,
    updateNumber: vi.fn(),
    deleteNumber: vi.fn(),
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
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import PlatformsPage from "@/app/dashboard/platforms/page";
import EvolutionPlatformsPage from "@/app/dashboard/platforms/evolution/page";
import PlatformEvolutionDetailPage from "@/app/dashboard/platforms/evolution/[id]/page";
import PlatformsNewEvolutionPage from "@/app/dashboard/platforms/evolution/new/page";
import TelegramConnectionsPage from "@/app/dashboard/platforms/telegram/page";
import TelegramConnectionDetailPage from "@/app/dashboard/platforms/telegram/[id]/page";
import NewTelegramConnectionPage from "@/app/dashboard/platforms/telegram/new/page";
import PlatformsWhatsAppPage from "@/app/dashboard/platforms/whatsapp/page";
import PlatformsWhatsAppDetailPage from "@/app/dashboard/platforms/whatsapp/[id]/page";
import PlatformsNewWhatsAppPage from "@/app/dashboard/platforms/whatsapp/new/page";

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

describe("platforms index — create buttons gated", () => {
  it("client sees no WhatsApp/Telegram create buttons but keeps the page", async () => {
    setupRole("client");
    const html = await renderToHtml(React.createElement(PlatformsPage));

    expect(html).toContain("Plataformas");
    expect(html).not.toContain('href="/dashboard/platforms/evolution/new"');
    expect(html).not.toContain('href="/dashboard/platforms/telegram/new"');
  });

  it("admin keeps both create buttons", async () => {
    setupRole("admin");
    const html = await renderToHtml(React.createElement(PlatformsPage));

    expect(html).toContain('href="/dashboard/platforms/evolution/new"');
    expect(html).toContain('href="/dashboard/platforms/telegram/new"');
  });
});

describe("platforms/evolution — Nueva Conexión gated", () => {
  it("client sees no create CTA in header or empty state", async () => {
    setupRole("client");
    const html = await renderToHtml(
      React.createElement(EvolutionPlatformsPage),
    );

    expect(html).toContain("WhatsApp (Evolution)");
    expect(html).not.toContain('href="/dashboard/platforms/evolution/new"');
    expect(html).not.toContain("Nueva Conexión");
    expect(html).not.toContain("Configurar primera instancia");
  });

  it("admin keeps the Nueva Conexión CTA", async () => {
    setupRole("admin");
    const html = await renderToHtml(
      React.createElement(EvolutionPlatformsPage),
    );

    expect(html).toContain('href="/dashboard/platforms/evolution/new"');
  });
});

describe("platforms/evolution/[id] — connect/anti-spam/delete gated", () => {
  it("client sees info + diagnostics but no mutation controls", async () => {
    setupRole("client");
    const html = await renderToHtml(
      React.createElement(PlatformEvolutionDetailPage, {
        params: Promise.resolve({ id: "c1" }),
      }),
    );

    expect(html).toContain("WhatsApp Principal");
    expect(html).toContain("Diagnóstico: verificar estado real");
    expect(html).not.toContain("Vincular WhatsApp");
    expect(html).not.toContain("Cambiar número vinculado");
    expect(html).not.toContain("Guardar configuración anti-spam");
    expect(html).not.toContain("Zona de Peligro");
    expect(html).not.toContain("Eliminar Instancia");
  });

  it("admin keeps connect, anti-spam save and delete controls", async () => {
    setupRole("admin");
    const html = await renderToHtml(
      React.createElement(PlatformEvolutionDetailPage, {
        params: Promise.resolve({ id: "c1" }),
      }),
    );

    expect(html).toContain("Vincular WhatsApp");
    expect(html).toContain("Guardar configuración anti-spam");
    expect(html).toContain("Eliminar Instancia");
  });
});

describe("platforms/evolution/new — create flow unreachable for client", () => {
  it("client sees a no-access card, never the create form", async () => {
    setupRole("client");
    const html = await renderToHtml(
      React.createElement(PlatformsNewEvolutionPage),
    );

    expect(html).toContain(NO_ACCESS);
    expect(html).not.toContain("Conectar WhatsApp (Evolution API)");
    expect(html).not.toContain("Selecciona el negocio y crea la conexión");
  });

  it("admin sees the create form", async () => {
    setupRole("admin");
    const html = await renderToHtml(
      React.createElement(PlatformsNewEvolutionPage),
    );

    expect(html).toContain("Conectar WhatsApp (Evolution API)");
    expect(html).not.toContain(NO_ACCESS);
  });
});

describe("platforms/telegram — Conectar Bot gated", () => {
  it("client sees no connect CTA in header or empty state", async () => {
    setupRole("client");
    const html = await renderToHtml(React.createElement(TelegramConnectionsPage));

    expect(html).toContain("Telegram");
    expect(html).not.toContain('href="/dashboard/platforms/telegram/new"');
    expect(html).not.toContain("Conectar Bot");
  });

  it("admin keeps the Conectar Bot CTA", async () => {
    setupRole("admin");
    const html = await renderToHtml(React.createElement(TelegramConnectionsPage));

    expect(html).toContain('href="/dashboard/platforms/telegram/new"');
  });
});

describe("platforms/telegram/[id] — delete/edit/webhook gated", () => {
  it("client sees info only, no delete/edit/webhook controls", async () => {
    setupRole("client");
    const html = await renderToHtml(
      React.createElement(TelegramConnectionDetailPage),
    );

    expect(html).toContain("WhatsApp Principal");
    expect(html).toContain("Información");
    expect(html).not.toContain("Eliminar");
    expect(html).not.toContain('value="edit"');
    expect(html).not.toContain("Editar");
    expect(html).not.toContain("Registrar Webhook");
    expect(html).not.toContain("Re-registrar Webhook");
  });

  it("admin keeps delete, edit tab and webhook controls", async () => {
    setupRole("admin");
    const html = await renderToHtml(
      React.createElement(TelegramConnectionDetailPage),
    );

    expect(html).toContain("Eliminar");
    expect(html).toContain("Editar");
    expect(html).toContain("Registrar Webhook");
  });
});

describe("platforms/telegram/new — create flow unreachable for client", () => {
  it("client sees a no-access card, never the create form", async () => {
    setupRole("client");
    const html = await renderToHtml(React.createElement(NewTelegramConnectionPage));

    expect(html).toContain(NO_ACCESS);
    expect(html).not.toContain("Conectar Bot de Telegram");
  });

  it("admin sees the create form", async () => {
    setupRole("admin");
    const html = await renderToHtml(React.createElement(NewTelegramConnectionPage));

    expect(html).toContain("Conectar Bot de Telegram");
    expect(html).not.toContain(NO_ACCESS);
  });
});

describe("platforms/whatsapp — Nuevo Número gated", () => {
  it("client sees no create button in header or list empty state", async () => {
    setupRole("client");
    const html = await renderToHtml(React.createElement(PlatformsWhatsAppPage));

    expect(html).toContain("Números WhatsApp");
    expect(html).not.toContain('href="/dashboard/platforms/whatsapp/new"');
    expect(html).not.toContain('href="/dashboard/whatsapp/new"');
    expect(html).not.toContain("Registrar Número");
  });

  it("admin keeps both create CTAs", async () => {
    setupRole("admin");
    const html = await renderToHtml(React.createElement(PlatformsWhatsAppPage));

    expect(html).toContain('href="/dashboard/platforms/whatsapp/new"');
    expect(html).toContain('href="/dashboard/whatsapp/new"');
  });
});

describe("platforms/whatsapp/[id] — delete/edit gated", () => {
  it("client sees info only", async () => {
    setupRole("client");
    const html = await renderToHtml(
      React.createElement(PlatformsWhatsAppDetailPage),
    );

    expect(html).toContain("+573001234567");
    expect(html).not.toContain("Eliminar");
    expect(html).not.toContain('value="edit"');
    expect(html).not.toContain("Editar");
  });

  it("admin keeps delete and edit controls", async () => {
    setupRole("admin");
    const html = await renderToHtml(
      React.createElement(PlatformsWhatsAppDetailPage),
    );

    expect(html).toContain("Eliminar");
    expect(html).toContain("Editar");
  });
});

describe("platforms/whatsapp/new — create flow unreachable for client", () => {
  it("client sees a no-access card, never the create form", async () => {
    setupRole("client");
    const html = await renderToHtml(React.createElement(PlatformsNewWhatsAppPage));

    expect(html).toContain(NO_ACCESS);
    expect(html).not.toContain("Registrar Número WhatsApp");
  });

  it("admin sees the create form", async () => {
    setupRole("admin");
    const html = await renderToHtml(React.createElement(PlatformsNewWhatsAppPage));

    expect(html).toContain("Registrar Número WhatsApp");
    expect(html).not.toContain(NO_ACCESS);
  });
});