import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";

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

import { LandingAutomation } from "@/components/sections/landing-automation";

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

describe("LandingAutomation (cross-sell back to the WhatsApp primary line)", () => {
  it("links the primary CTA back to the automation home (/)", async () => {
    const html = await renderToHtml(React.createElement(LandingAutomation));
    expect(html).toContain("Conocer la automatización WhatsApp");
    expect(html).toContain('href="/"');
  });

  it("offers a secondary path to the plans section", async () => {
    const html = await renderToHtml(React.createElement(LandingAutomation));
    expect(html).toContain("Ver planes y precios");
    expect(html).toContain('href="/#planes"');
  });

  it("uses tú (tuteo) register and no voseo/usted in the rendered copy", async () => {
    const html = await renderToHtml(React.createElement(LandingAutomation));
    expect(html).toContain("¿También quieres que tu negocio responda");
    expect(html).not.toMatch(
      /\b(usted|tenés|querés|podés|volvé|mirá|dale|tranqui|al toque)\b/i,
    );
  });
});