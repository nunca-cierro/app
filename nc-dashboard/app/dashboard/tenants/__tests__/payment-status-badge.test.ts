import { describe, expect, it } from "vitest";

describe("PaymentStatusBadge", () => {
  it("imports without error", async () => {
    const mod = await import(
      "@/app/dashboard/tenants/components/payment-status-badge"
    );
    expect(mod.PaymentStatusBadge).toBeDefined();
  });
});
