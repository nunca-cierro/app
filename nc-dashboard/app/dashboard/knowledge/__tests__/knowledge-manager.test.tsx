import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import { KnowledgeManager } from "../components/knowledge-manager";

// Mock useKnowledge
vi.mock("@/hooks/use-knowledge", () => ({
  useKnowledge: () => ({
    documents: [
      {
        id: "doc-1",
        title: "Manual Clínico",
        source_type: "file",
        source_url: null,
        status: "indexed",
        created_at: "2026-11-20T12:00:00Z",
      },
    ],
    isLoading: false,
    error: null,
    extractUrl: vi.fn(),
    extractFile: vi.fn(),
    saveDocument: vi.fn(),
    updateDocument: vi.fn(),
    resyncDocument: vi.fn(),
    deleteDocument: vi.fn(),
    refetch: vi.fn(),
  }),
}));

function stripSsrComments(html: string): string {
  return html.replace(/<!-- -->/g, "");
}

function renderComponent(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const { pipe } = renderToPipeableStream(
      React.createElement(KnowledgeManager),
      {
        onError: (err) => reject(err),
        onAllReady: () => {
          const sink = new PassThrough();
          sink.on("data", (chunk: Buffer) => chunks.push(chunk));
          sink.on("end", () =>
            resolve(stripSsrComments(Buffer.concat(chunks).toString("utf8"))),
          );
          sink.on("error", reject);
          pipe(sink);
        },
      },
    );
  });
}

describe("KnowledgeManager Component (SSR)", () => {
  it("renders knowledge manager title and source options", async () => {
    const html = await renderComponent();

    expect(html).toContain("Base de Conocimiento y Documentos");
    expect(html).toContain("Desde Sitio Web (URL)");
    expect(html).toContain("Desde Archivo (PDF/TXT)");
    expect(html).toContain("Redacción Directa");
  });

  it("renders existing indexed document list", async () => {
    const html = await renderComponent();

    expect(html).toContain("Manual Clínico");
    expect(html).toContain("file");
  });
});
