import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    TOKEN_KEYS: { access: "test_token", user: "test_user" },
  };
});

describe("use-billing", () => {
  it("imports without error", async () => {
    const mod = await import("@/hooks/use-billing");
    expect(mod.useBilling).toBeDefined();
  });
});
