import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";

/**
 * HOME SWAP test — the automation-first home composition.
 *
 * The vitest environment is node (no jsdom), so components are rendered with
 * react-dom/server (pattern: precios-content.test.tsx). AutomationContent is
 * presentational; the rendered output is the assertion surface.
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

import { AutomationContent } from "@/components/automation-content";

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

describe("home swap — automation is the PRIMARY offer on the home", () => {
  it("leads with the WhatsApp automation hero and SaaS plan pricing", async () => {
    const html = await renderToHtml(React.createElement(AutomationContent));
    expect(html).toContain("Clientes atendidos todo el tiempo.");
    expect(html).toContain("Desde $390.000/mes + IVA");
    expect(html).toContain("Desde $1.590.000/mes + IVA");
  });

  it("positions the web service as a secondary add-on linked to /inicio", async () => {
    const html = await renderToHtml(React.createElement(AutomationContent));
    expect(html).toContain("Sitios web");
    expect(html).toContain("Ver planes de sitios web");
    expect(html).toContain('href="/inicio"');
    expect(html).toContain("Desde $699.900");
  });

  it("renders the automation plans BEFORE the web add-on section", async () => {
    const html = await renderToHtml(React.createElement(AutomationContent));
    const plansAt = html.indexOf('id="planes"');
    const webAt = html.indexOf('id="sitios-web"');
    expect(plansAt).toBeGreaterThan(-1);
    expect(webAt).toBeGreaterThan(-1);
    expect(plansAt).toBeLessThan(webAt);
  });
});