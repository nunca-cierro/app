import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";

/**
 * The vitest environment is node (no jsdom), so components are rendered with
 * react-dom/server (pattern: role-select.test.tsx). AdminQuickActions is a
 * pure presentational gate — absence/presence is a rendered-output property,
 * which is exactly what SSR proves (RV-4 scenario: admin/client see NO quick
 * actions; superadmin sees all three).
 */

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

import { AdminQuickActions } from "@/app/dashboard/page";

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

describe("AdminQuickActions (RV-4 — quick actions superadmin-only)", () => {
  it("renders all three quick actions for superadmin", async () => {
    const html = await renderToHtml(
      React.createElement(AdminQuickActions, { role: "superadmin" }),
    );

    expect(html).toContain("Nuevo Agente");
    expect(html).toContain("Nuevo Negocio");
    expect(html).toContain("Conversaciones");
    // All three link to their destination routes
    expect(html).toContain('href="/dashboard/agents/new"');
    expect(html).toContain('href="/dashboard/tenants/new"');
    expect(html).toContain('href="/dashboard/conversations"');
  });

  it("renders nothing for admin (RV-4 scenario)", async () => {
    const html = await renderToHtml(
      React.createElement(AdminQuickActions, { role: "admin" }),
    );
    expect(html).toBe("");
  });

  it("renders nothing for client", async () => {
    const html = await renderToHtml(
      React.createElement(AdminQuickActions, { role: "client" }),
    );
    expect(html).toBe("");
  });

  it("renders nothing when no role is known yet", async () => {
    const html = await renderToHtml(
      React.createElement(AdminQuickActions, { role: null }),
    );
    expect(html).toBe("");
  });
});