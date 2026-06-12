import { describe, expect, it } from "vitest";

describe("ConfirmPaymentDialog", () => {
  it("imports without error", async () => {
    const mod = await import(
      "@/app/dashboard/tenants/components/confirm-payment-dialog"
    );
    expect(mod.ConfirmPaymentDialog).toBeDefined();
  });
});
