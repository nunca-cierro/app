import { describe, expect, it } from "vitest";

import { CAPABILITIES, hasCapability } from "@/lib/capabilities";
import type { AuthUser } from "@/lib/types";

function user(overrides: Partial<AuthUser>): AuthUser {
  return {
    id: "u1",
    email: "a@b.co",
    name: "A",
    role: "client",
    tenant_id: "t1",
    ...overrides,
  };
}

describe("hasCapability — backend capabilities are authoritative", () => {
  it("returns true when the backend announced the capability", () => {
    const u = user({
      plan: "basic",
      capabilities: ["dashboard.view", "conversations.view"],
    });
    expect(hasCapability(u, CAPABILITIES.dashboardView)).toBe(true);
    expect(hasCapability(u, CAPABILITIES.conversationsView)).toBe(true);
  });

  it("returns false when the backend did NOT announce the capability", () => {
    const u = user({
      plan: "basic",
      capabilities: ["dashboard.view", "conversations.view"],
    });
    // backend is source of truth — even if the (stale) plan field says enterprise
    expect(hasCapability(u, CAPABILITIES.businessEdit)).toBe(false);
    expect(hasCapability(u, CAPABILITIES.agentsManage)).toBe(false);
  });

  it("enterprise plan announced by backend grants edit", () => {
    const u = user({
      plan: "enterprise",
      capabilities: [
        "dashboard.view",
        "conversations.view",
        "agents.manage",
        "connections.manage",
        "ai.responses",
        "business.view",
        "business.edit",
      ],
    });
    expect(hasCapability(u, CAPABILITIES.businessEdit)).toBe(true);
    expect(hasCapability(u, CAPABILITIES.agentsManage)).toBe(true);
  });
});

describe("hasCapability — safe fallback for legacy sessions (no capabilities)", () => {
  it("basic/trial fallback is view-only (dashboard never locked out)", () => {
    const u = user({ plan: "basic", capabilities: null });
    expect(hasCapability(u, CAPABILITIES.dashboardView)).toBe(true);
    expect(hasCapability(u, CAPABILITIES.conversationsView)).toBe(true);
    expect(hasCapability(u, CAPABILITIES.businessView)).toBe(false);
    expect(hasCapability(u, CAPABILITIES.agentsManage)).toBe(false);
  });

  it("professional fallback adds management, AI and business edit", () => {
    const u = user({ role: "admin", plan: "professional", capabilities: null });
    expect(hasCapability(u, CAPABILITIES.agentsManage)).toBe(true);
    expect(hasCapability(u, CAPABILITIES.ai)).toBe(true);
    expect(hasCapability(u, CAPABILITIES.businessEdit)).toBe(true);
  });

  it("enterprise fallback includes edit", () => {
    const u = user({ role: "admin", plan: "enterprise", capabilities: null });
    expect(hasCapability(u, CAPABILITIES.businessEdit)).toBe(true);
  });

  it("superadmin fallback gets everything", () => {
    const u = user({ role: "superadmin", capabilities: null });
    expect(hasCapability(u, CAPABILITIES.businessEdit)).toBe(true);
    expect(hasCapability(u, CAPABILITIES.agentsManage)).toBe(true);
  });

  it("returns false for null/undefined user", () => {
    expect(hasCapability(null, CAPABILITIES.dashboardView)).toBe(false);
    expect(hasCapability(undefined, CAPABILITIES.dashboardView)).toBe(false);
  });
});
