import { describe, expect, it } from "vitest";
import { buildAdminStats } from "@/lib/dashboard-stats";
import type { DashboardMetrics } from "@/lib/types";

const metrics: DashboardMetrics = {
  total_tenants: 12,
  active_tenants: 9,
  messages_today: 340,
  messages_total: 12000,
  messages_in: 8000,
  messages_out: 4000,
};

describe("buildAdminStats", () => {
  it("returns an empty list while metrics are still loading", () => {
    expect(buildAdminStats(null, 0)).toEqual([]);
  });

  it("maps metrics into the four dashboard stat cards", () => {
    const stats = buildAdminStats(metrics, 5);
    expect(stats.map((s) => s.title)).toEqual([
      "Negocios",
      "Leads",
      "Mensajes Hoy",
      "Uso API",
    ]);
  });

  it("computes the API usage value from in + out messages", () => {
    const stats = buildAdminStats(metrics, 0);
    const api = stats.find((s) => s.id === "api-usage");
    expect(api?.value).toBe("12000");
  });

  it("uses the conversation count as the leads value", () => {
    const stats = buildAdminStats(metrics, 7);
    const leads = stats.find((s) => s.id === "leads");
    expect(leads?.value).toBe("7");
  });

  it("reflects different metric inputs in values and subtitles", () => {
    const stats = buildAdminStats(
      { ...metrics, total_tenants: 3, active_tenants: 1 },
      0,
    );
    const tenants = stats.find((s) => s.id === "tenants");
    expect(tenants?.value).toBe("3");
    expect(tenants?.subtitle).toBe("1 activos");
  });
});
