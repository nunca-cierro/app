import { describe, expect, it } from "vitest";

describe("expired-trial-overlay", () => {
  it("imports without error", async () => {
    const mod = await import(
      "@/app/dashboard/components/expired-trial-overlay"
    );
    expect(mod.ExpiredTrialOverlay).toBeDefined();
  });
});
