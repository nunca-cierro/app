import { afterEach, describe, expect, it, vi } from "vitest";
import { getPlanUsage } from "@/lib/api";
import type { PlanUsage } from "@/lib/types";

/**
 * Slice 3 — plan usage data layer contract (plan-differentiation).
 *
 * getPlanUsage() is the typed client for GET /api/v1/plans/usage (Phase 2
 * backend, design D3): tenant comes from the JWT cookie (credentials
 * include), it is a read so it never sends X-CSRF-Token, and the parsed
 * payload must mirror PlanUsageResponse 1:1 (pct null = unlimited plan).
 */

const USAGE_PAYLOAD: PlanUsage = {
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
};

function stubFetch(response: Response) {
  const fetchMock = vi.fn(
    async (_url: string | URL | Request, _init?: RequestInit) => response,
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getPlanUsage", () => {
  it("GETs /api/v1/plans/usage with credentials include", async () => {
    const fetchMock = stubFetch(jsonResponse(USAGE_PAYLOAD));

    await getPlanUsage();

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("/api/v1/plans/usage");
    expect((init as RequestInit).method ?? "GET").toBe("GET");
    expect((init as RequestInit).credentials).toBe("include");
  });

  it("never sends X-CSRF-Token on the read", async () => {
    vi.stubGlobal("document", { cookie: "nc_csrf=csrf-xyz" });
    const fetchMock = stubFetch(jsonResponse(USAGE_PAYLOAD));

    await getPlanUsage();

    const [, init] = fetchMock.mock.calls[0];
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["X-CSRF-Token"]).toBeUndefined();
  });

  it("parses a professional payload (1200/5000 -> pct 24, over_limit false)", async () => {
    stubFetch(jsonResponse(USAGE_PAYLOAD));

    const usage = await getPlanUsage();

    expect(usage.plan).toBe("professional");
    expect(usage.limits.max_conversations_per_month).toBe(5000);
    expect(usage.usage.ai_responses).toBe(1200);
    expect(usage.pct).toBe(24);
    expect(usage.over_limit).toBe(false);
  });

  it("parses an enterprise payload with pct null (unlimited)", async () => {
    const enterprise: PlanUsage = {
      ...USAGE_PAYLOAD,
      plan: "enterprise",
      limits: {
        max_agents: null,
        max_products: null,
        max_conversations_per_month: null,
        max_businesses: null,
      },
      pct: null,
      over_limit: false,
    };
    stubFetch(jsonResponse(enterprise));

    const usage = await getPlanUsage();

    expect(usage.plan).toBe("enterprise");
    expect(usage.pct).toBeNull();
    expect(usage.limits.max_conversations_per_month).toBeNull();
  });

  it("surfaces over_limit true on excess (pct 102)", async () => {
    stubFetch(
      jsonResponse({
        ...USAGE_PAYLOAD,
        usage: { ai_responses: 5100, products: 12, businesses: 2 },
        pct: 102,
        over_limit: true,
      }),
    );

    const usage = await getPlanUsage();

    expect(usage.usage.ai_responses).toBe(5100);
    expect(usage.pct).toBe(102);
    expect(usage.over_limit).toBe(true);
  });
});