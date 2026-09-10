import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";

/**
 * The vitest environment is node (no jsdom), so components are rendered with
 * react-dom/server. The internal `nuncacierro` category is superadmin-only and
 * must appear in the template selector ONLY for that role.
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

vi.mock("@/hooks/use-agent-templates", () => ({
  useAgentTemplates: () => ({
    templates: [],
    isLoading: false,
  }),
}));

import { TemplateSelector } from "@/app/dashboard/agents/components/template-selector";

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

function renderSelector(): Promise<string> {
  return renderToHtml(
    React.createElement(TemplateSelector, {
      onSelect: () => {},
      selectedId: null,
    }),
  );
}

describe("TemplateSelector — internal nuncacierro category (superadmin-only)", () => {
  it("renders the internal category for superadmin", async () => {
    setupRole("superadmin");
    const html = await renderSelector();

    expect(html).toContain("NuncaCierro");
  });

  it("hides the internal category for admin", async () => {
    setupRole("admin");
    const html = await renderSelector();

    expect(html).not.toContain("NuncaCierro");
  });

  it("hides the internal category for client", async () => {
    setupRole("client");
    const html = await renderSelector();

    expect(html).not.toContain("NuncaCierro");
  });
});
