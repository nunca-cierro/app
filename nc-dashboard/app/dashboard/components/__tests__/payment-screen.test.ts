import { describe, expect, it } from "vitest";

describe("payment-screen", () => {
  it("imports without error", async () => {
    const mod = await import("@/app/dashboard/components/payment-screen");
    expect(mod.PaymentScreen).toBeDefined();
  });
});
