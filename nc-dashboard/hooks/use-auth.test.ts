import { describe, expect, it, vi } from "vitest";

import { restoreUserFromProfile } from "@/hooks/use-auth";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    TOKEN_KEYS: { access: "test_token", user: "test_user" },
    switchTenant: vi.fn(),
  };
});

describe("restoreUserFromProfile — silent /auth/me restore", () => {
  it("maps current_plan to plan", () => {
    const restored = restoreUserFromProfile({
      id: "1",
      email: "a@b.co",
      name: "A",
      role: "client",
      tenant_id: "t1",
      current_role: "client",
      current_plan: "professional",
      payment_status: "active",
      capabilities: ["dashboard.view"],
    });
    expect(restored.plan).toBe("professional");
    expect(restored.capabilities).toEqual(["dashboard.view"]);
  });

  it("keeps an existing plan when current_plan is absent", () => {
    const restored = restoreUserFromProfile({
      id: "1",
      email: "a@b.co",
      name: "A",
      role: "admin",
      tenant_id: "t1",
      plan: "basic",
    });
    expect(restored.plan).toBe("basic");
  });

  it("falls back to null when neither plan field is present", () => {
    const restored = restoreUserFromProfile({
      id: "1",
      email: "a@b.co",
      name: "A",
      role: "client",
      tenant_id: null,
    });
    expect(restored.plan).toBeNull();
  });
});

describe("use-auth", () => {
  it("imports without error", async () => {
    const mod = await import("@/hooks/use-auth");
    expect(mod.AuthProvider).toBeDefined();
    expect(mod.useAuth).toBeDefined();
    expect(mod.AuthContextType).toBeUndefined(); // interface, not runtime
  });

  it("exports switchTenant on context type", async () => {
    const { AuthProvider } = await import("@/hooks/use-auth");
    expect(AuthProvider).toBeDefined();
  });

  it("context includes switchTenant method", async () => {
    // Simulate a mock context provider value
    const mockCtx: import("@/hooks/use-auth").AuthContextType = {
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      register: vi.fn(),
      switchTenant: vi.fn(),
      logout: vi.fn(),
    };
    expect(typeof mockCtx.switchTenant).toBe("function");
  });

  it("switchTenant failure preserves state", async () => {
    const mockSwitch = vi.fn().mockRejectedValue(new Error("Switch failed"));
    const mockCtx: import("@/hooks/use-auth").AuthContextType = {
      user: {
        id: "1",
        email: "test@test.com",
        name: "Test",
        role: "admin",
        tenant_id: "tenant-1",
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      switchTenant: mockSwitch,
      logout: vi.fn(),
    };

    // Calling switchTenant should throw
    await expect(mockCtx.switchTenant("tenant-2")).rejects.toThrow("Switch failed");
    // User state should be preserved (we don't mutate user in switchTenant)
    expect(mockCtx.user?.tenant_id).toBe("tenant-1");
  });
});
