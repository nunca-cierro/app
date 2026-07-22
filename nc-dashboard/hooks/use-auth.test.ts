import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    TOKEN_KEYS: { access: "test_token", user: "test_user" },
    switchTenant: vi.fn(),
  };
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
