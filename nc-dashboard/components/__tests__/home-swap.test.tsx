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
  it("leads with the keyword-strong WhatsApp automation hero and SaaS plan pricing", async () => {
    const html = await renderToHtml(React.createElement(AutomationContent));
    expect(html).toContain("Atienda a sus clientes por WhatsApp 24/7");
    expect(html).toContain("Su negocio nunca cierra");
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

describe("FAQ — FAQPage JSON-LD is server-built from the FAQ data", () => {
  it("emits a valid application/ld+json FAQPage script in the section", async () => {
    const html = await renderToHtml(React.createElement(AutomationContent));
    const faqStart = html.indexOf('id="faq"');
    const faqHtml = html.slice(faqStart, html.indexOf('id="contacto"'));
    expect(faqHtml).toContain('type="application/ld+json"');
    expect(faqHtml).toContain('"@type":"FAQPage"');
    expect(faqHtml).toContain('"@type":"Question"');
    expect(faqHtml).toContain('"name":"¿Qué pasa con mi WhatsApp cuando configuran el bot? ¿Dejo de recibir mensajes?"');
    expect(faqHtml).toContain('"@type":"Answer"');
  });
});

describe("negocios — premium mid-market cards (anti-barrio)", () => {
  it("shows the six premium verticals with high-ticket messages", async () => {
    const html = await renderToHtml(React.createElement(AutomationContent));
    expect(html).toContain("Boutique de moda");
    expect(html).toContain("Clínica estética");
    expect(html).toContain("Restaurante gourmet");
    expect(html).toContain("Spa y bienestar");
    expect(html).toContain("Inmobiliaria");
    expect(html).toContain("Showroom automotriz");
    expect(html).toContain("¿Tienen el vestido de la vitrina disponible en talla M?");
    expect(html).toContain("¿Me agendan una prueba de manejo del modelo 2026?");
  });

  it("drops the low-ticket barrio cards and their emojis", async () => {
    const html = await renderToHtml(React.createElement(AutomationContent));
    const negociosHtml = html.slice(
      html.indexOf('id="negocios"'),
      html.indexOf('id="planes"'),
    );
    expect(negociosHtml).not.toContain("Tienda de barrio");
    expect(negociosHtml).not.toContain("Panadería");
    expect(negociosHtml).not.toContain("Hamburguesería");
    expect(negociosHtml).not.toContain("¿Cuánto vale el arroz kilo?");
    for (const emoji of ["🛒", "🥐", "🍔", "✂️", "🎂", "🍽️"]) {
      expect(negociosHtml).not.toContain(emoji);
    }
  });
});