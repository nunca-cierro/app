import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";

/**
 * The vitest environment is node (no jsdom), so components are rendered with
 * react-dom/server. NewAgentHeaderButton is the agents-page "Nuevo Agente"
 * header action — it must render only for superadmin (RV-4), mirroring the
 * dashboard quick-action gate.
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

import { NewAgentHeaderButton } from "@/app/dashboard/agents/page";

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

describe("NewAgentHeaderButton (RV-4 — agents header gated)", () => {
  it("renders the Nuevo Agente button for superadmin", async () => {
    const html = await renderToHtml(
      React.createElement(NewAgentHeaderButton, { role: "superadmin" }),
    );
    expect(html).toContain("Nuevo Agente");
    expect(html).toContain('href="/dashboard/agents/new"');
  });

  it("renders nothing for admin", async () => {
    const html = await renderToHtml(
      React.createElement(NewAgentHeaderButton, { role: "admin" }),
    );
    expect(html).toBe("");
  });

  it("renders nothing for client", async () => {
    const html = await renderToHtml(
      React.createElement(NewAgentHeaderButton, { role: "client" }),
    );
    expect(html).toBe("");
  });
});