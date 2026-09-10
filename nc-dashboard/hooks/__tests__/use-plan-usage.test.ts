import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToPipeableStream } from "react-dom/server";
import {
  usePlanUsage,
  loadPlanUsage,
  type UsePlanUsageReturn,
} from "@/hooks/use-plan-usage";
import type { PlanUsage } from "@/lib/types";

/**
 * Slice 3 — usePlanUsage hook contract (plan-differentiation, task 3.3).
 *
 * The vitest environment is node (no jsdom) → the hook executes inside a
 * probe component rendered with react-dom/server (pattern:
 * use-users.test.tsx). Effects are skipped in SSR, so the fetch-on-tenant
 * behavior is extracted into the pure `loadPlanUsage` helper and tested
 * directly; the probe proves the render contract (initial state per
 * tenant presence: no tenant → idle, no pending fetch).
 */

const mocks = vi.hoisted(() => ({
  getPlanUsage: vi.fn(),
}));

vi.mock("@/lib/api", () => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  }
  return { ApiError, getPlanUsage: mocks.getPlanUsage };
});

const USAGE: PlanUsage = {
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

describe("loadPlanUsage (pure fetch gate)", () => {
  it("fetches usage when a tenant id is present", async () => {
    const fetchUsage = vi.fn().mockResolvedValue(USAGE);

    const result = await loadPlanUsage("tenant-1", fetchUsage);

    expect(fetchUsage).toHaveBeenCalledTimes(1);
    expect(result).toEqual(USAGE);
  });

  it("skips the fetch and resolves null when tenant id is null", async () => {
    const fetchUsage = vi.fn().mockResolvedValue(USAGE);

    const result = await loadPlanUsage(null, fetchUsage);

    expect(fetchUsage).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("skips the fetch when tenant id is undefined (profile not ready)", async () => {
    const fetchUsage = vi.fn().mockResolvedValue(USAGE);

    const result = await loadPlanUsage(undefined, fetchUsage);

    expect(fetchUsage).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});

describe("usePlanUsage render contract", () => {
  let captured: UsePlanUsageReturn | null = null;

  function HookProbe({ tenantId }: { tenantId: string | null }): null {
    captured = usePlanUsage(tenantId);
    return null;
  }

  function renderProbe(tenantId: string | null): Promise<void> {
    captured = null;
    return new Promise((resolve, reject) => {
      renderToPipeableStream(React.createElement(HookProbe, { tenantId }), {
        onError: reject,
        onAllReady: () => resolve(),
      });
    });
  }

  it("starts loading with no data for a known tenant", async () => {
    await renderProbe("tenant-1");

    expect(captured).not.toBeNull();
    expect(captured!.data).toBeNull();
    expect(captured!.isLoading).toBe(true);
    expect(captured!.error).toBeNull();
    expect(typeof captured!.refetch).toBe("function");
  });

  it("stays idle (no pending fetch) when there is no active tenant", async () => {
    await renderProbe(null);

    expect(captured).not.toBeNull();
    expect(captured!.data).toBeNull();
    expect(captured!.isLoading).toBe(false);
    expect(captured!.error).toBeNull();
  });
});