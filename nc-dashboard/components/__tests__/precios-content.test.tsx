import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";

/**
 * The vitest environment is node (no jsdom), so components are rendered with
 * react-dom/server (pattern: dashboard-quick-actions.test.tsx). PreciosContent
 * is presentational — the rendered output is the assertion surface.
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

import { PreciosContent } from "@/components/precios-content";

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

describe("PreciosContent (Escenario A live pricing page)", () => {
  it("renders a single H1 with the pricing keyword", async () => {
    const html = await renderToHtml(React.createElement(PreciosContent));
    const h1Count = (html.match(/<h1/g) ?? []).length;
    expect(h1Count).toBe(1);
    expect(html).toContain("Planes de automatización WhatsApp");
  });

  it("shows the Escenario A prices with '+ IVA'", async () => {
    const html = await renderToHtml(React.createElement(PreciosContent));
    expect(html).toContain("Desde $390.000/mes + IVA");
    expect(html).toContain("Desde $790.000/mes + IVA");
    expect(html).toContain("Desde $1.590.000/mes + IVA");
  });

  it("shows the Corporativo card gated as 'A cotizar' with a quote CTA", async () => {
    const html = await renderToHtml(React.createElement(PreciosContent));
    expect(html).toContain("A cotizar");
    expect(html).toContain("Cotizar plan Corporativo");
  });

  it("surfaces the 7-day trial as programmed-only", async () => {
    const html = await renderToHtml(React.createElement(PreciosContent));
    expect(html).toContain("7 días");
    expect(html).toContain("programadas");
    expect(html).toContain("sin inteligencia artificial");
  });

  it("links the web one-time service as a separate product line", async () => {
    const html = await renderToHtml(React.createElement(PreciosContent));
    expect(html).toContain("Sitios web — servicio aparte");
    expect(html).toContain('href="/inicio#precios"');
    expect(html).toContain("Desde $699.900 COP");
  });
});