import { describe, expect, it } from "vitest";

describe("use-platform-connections", () => {
  it("exports usePlatformConnections and usePlatformConnection", async () => {
    const mod = await import("@/hooks/use-platform-connections");
    expect(mod.usePlatformConnections).toBeDefined();
    expect(mod.usePlatformConnection).toBeDefined();
  });
});
