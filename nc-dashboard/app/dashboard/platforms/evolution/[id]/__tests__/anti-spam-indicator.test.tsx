import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import Page from "@/app/dashboard/platforms/evolution/[id]/page";

/**
 * The vitest environment is node (no jsdom), so the page is rendered with
 * react-dom/server (pipeable stream renderer — the only React 19 SSR path
 * that supports `use(promise)` for route params). This captures a full
 * render with the connection already loaded — exactly the state a user
 * sees right after a page refresh, which is where the active-mode
 * indicator must be correct.
 */

const mocks = vi.hoisted(() => ({
  connection: null as Record<string, unknown> | null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/hooks/use-platform-connections", () => ({
  usePlatformConnection: () => ({
    connection: mocks.connection,
    isLoading: false,
    error: null,
    connectEvolution: vi.fn(),
    refetchConnection: vi.fn(),
    disconnectEvolution: vi.fn(),
    updateConnection: vi.fn(),
    checkEvolutionState: vi.fn(),
  }),
}));

function makeConnection(extraData: Record<string, unknown> | null) {
  return {
    id: "conn-1",
    tenant_id: "tenant-1",
    platform_type: "evolution",
    display_name: "WhatsApp Principal",
    status: "active",
    extra_data: extraData,
  };
}

async function renderPage(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const { pipe } = renderToPipeableStream(
      React.createElement(Page, {
        params: Promise.resolve({ id: "conn-1" }),
      }),
      {
        onError: (err) => reject(err),
        onAllReady: () => {
          const sink = new PassThrough();
          sink.on("data", (chunk: Buffer) => chunks.push(chunk));
          sink.on("end", () =>
            resolve(Buffer.concat(chunks).toString("utf8")),
          );
          sink.on("error", reject);
          pipe(sink);
        },
      },
    );
  });
}

function optionTags(html: string): string[] {
  return html.match(/<option[^>]*>/g) ?? [];
}

describe("Evolution detail page — anti-spam active-mode indicator", () => {
  it("shows the saved block mode in the badge and select on a fresh render", async () => {
    mocks.connection = makeConnection({
      connection_status: "connected",
      anti_spam: { enabled: true, mode: "block" },
    });
    const html = await renderPage();

    expect(html).toContain("Modo activo: Bloquear");
    const blockOption = optionTags(html).find((tag) =>
      tag.includes('value="block"'),
    );
    expect(blockOption).toBeDefined();
    expect(blockOption).toContain("selected");
    const logOption = optionTags(html).find((tag) => tag.includes('value="log"'));
    expect(logOption).not.toContain("selected");
  });

  it("shows the saved log mode in the badge and select on a fresh render", async () => {
    mocks.connection = makeConnection({
      connection_status: "connected",
      anti_spam: { enabled: true, mode: "log" },
    });
    const html = await renderPage();

    expect(html).toContain("Modo activo: Registro");
    const logOption = optionTags(html).find((tag) => tag.includes('value="log"'));
    expect(logOption).toBeDefined();
    expect(logOption).toContain("selected");
    const blockOption = optionTags(html).find((tag) =>
      tag.includes('value="block"'),
    );
    expect(blockOption).not.toContain("selected");
  });

  it("shows an explicit unconfigured state instead of the first option when mode is missing", async () => {
    mocks.connection = makeConnection({ connection_status: "connected" });
    const html = await renderPage();

    expect(html).toContain("Sin configurar");
    expect(html).toContain("no tiene un modo guardado");
    expect(html).not.toContain("Modo activo");
    const blockOption = optionTags(html).find((tag) =>
      tag.includes('value="block"'),
    );
    expect(blockOption).not.toContain("selected");
    const logOption = optionTags(html).find((tag) => tag.includes('value="log"'));
    expect(logOption).not.toContain("selected");
  });

  it("shows an explicit unconfigured state for an unknown saved mode", async () => {
    mocks.connection = makeConnection({
      connection_status: "connected",
      anti_spam: { enabled: true, mode: "aggressive" },
    });
    const html = await renderPage();

    expect(html).toContain("Sin configurar");
    expect(html).not.toContain("Modo activo");
    const blockOption = optionTags(html).find((tag) =>
      tag.includes('value="block"'),
    );
    expect(blockOption).not.toContain("selected");
  });

  it("shows Desactivado when anti-spam is saved as disabled", async () => {
    mocks.connection = makeConnection({
      connection_status: "connected",
      anti_spam: { enabled: false, mode: "block" },
    });
    const html = await renderPage();

    expect(html).toContain("Desactivado");
    expect(html).not.toContain("Modo activo");
  });
});
