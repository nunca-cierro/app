import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import DashboardPage from "@/app/dashboard/page";
import type { PlanUsage } from "@/lib/types";

/**
 * Slice 3 — plan usage widget integration in ClientDashboard
 * (plan-differentiation, task 3.5: widget tras "Plan Actual").
 *
 * Vitest environment is node (no jsdom) → the page renders with
 * react-dom/server (pattern: platforms-gating.test.tsx). The five data
 * hooks are mocked; the assertions prove the page stays alive and the
 * widget appears after the plan card — and that an API error hides the
 * widget without breaking the page (WidgetApiErrorGraceful).
 */

const mocks = vi.hoisted(() => ({
  auth: {
    user: {
      id: "u1",
      email: "client@test.com",
      name: "Cliente",
      role: "client",
      current_role: "client",
      tenant_id: "t1",
      current_tenant_id: "t1",
      plan: "professional",
      payment_status: "active",
      capabilities: ["ai.responses", "dashboard.view", "conversations.view"],
    } as Record<string, unknown>,
    isLoading: false,
  },
  tenants: {
    tenants: [
      {
        id: "t1",
        name: "Mi Negocio",
        slug: "mi-negocio",
        status: "active",
        plan: "professional",
        payment_status: "active",
        created_at: new Date().toISOString(),
      },
    ],
    isLoading: false,
  },
  agents: { agents: [] },
  planUsage: {
    data: {
      plan: "professional",
      limits: {
        max_agents: 5,
        max_products: 50,
        max_conversations_per_month: 5000,
        max_businesses: 3,
      },
      usage: { ai_responses: 1200, products: 12, businesses: 2 },
      pct: 24,
      over_limit: false,
    } as PlanUsage | null,
    isLoading: false,
    error: null as string | null,
  },
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
  useAuth: () => mocks.auth,
}));

vi.mock("@/hooks/use-tenants", () => ({
  useTenants: () => mocks.tenants,
}));

vi.mock("@/hooks/use-agents", () => ({
  useAgents: () => mocks.agents,
}));

vi.mock("@/hooks/use-agent", () => ({
  useAgent: () => ({
    agent: null,
    prompts: [],
    isLoading: false,
    error: null,
    promptsLoading: false,
    updateAgent: vi.fn(),
    deleteAgent: vi.fn(),
    createPrompt: vi.fn(),
    updateBusinessConfig: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-plan-usage", () => ({
  usePlanUsage: () => mocks.planUsage,
}));

function stripSsrComments(html: string): string {
  return html.replace(/<!-- -->/g, "");
}

function renderDashboard(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const { pipe } = renderToPipeableStream(
      React.createElement(DashboardPage),
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

describe("ClientDashboard — plan usage widget integration", () => {
  it("renders the widget right after the Plan Actual card", async () => {
    mocks.planUsage = {
      data: {
        plan: "professional",
        limits: {
          max_agents: 5,
          max_products: 50,
          max_conversations_per_month: 5000,
          max_businesses: 3,
        },
        usage: { ai_responses: 1200, products: 12, businesses: 2 },
        pct: 24,
        over_limit: false,
      },
      isLoading: false,
      error: null,
    };

    const html = await renderDashboard();

    expect(html).toContain("Plan Actual");
    expect(html).toContain("Uso de tu plan");
    expect(html).toContain("1.200");
    expect(html).toContain("/ 5.000 respuestas IA este mes");
    // Widget tras "Plan Actual" — el orden importa (design, task 3.5).
    expect(html.indexOf("Plan Actual")).toBeLessThan(
      html.indexOf("Uso de tu plan"),
    );
  });

  it("hides the widget on API error without breaking the page", async () => {
    mocks.planUsage = { data: null, isLoading: false, error: "Error de red" };

    const html = await renderDashboard();

    expect(html).toContain("Plan Actual");
    expect(html).toContain("Mi Negocio");
    expect(html).not.toContain("Uso de tu plan");
  });

  it("renders Ilimitado without a bar for an enterprise tenant", async () => {
    mocks.planUsage = {
      data: {
        plan: "enterprise",
        limits: {
          max_agents: null,
          max_products: null,
          max_conversations_per_month: null,
          max_businesses: null,
        },
        usage: { ai_responses: 0, products: 0, businesses: 1 },
        pct: null,
        over_limit: false,
      },
      isLoading: false,
      error: null,
    };

    const html = await renderDashboard();

    expect(html).toContain("Uso de tu plan");
    expect(html).toContain("Ilimitado");
    expect(html).not.toContain("progressbar");
  });
});