import { describe, expect, it } from "vitest";
import type { PaymentInfo, PaymentMethod, PlanInfo } from "@/lib/types/billing";

describe("billing types", () => {
  it("PaymentMethod type has correct shape", () => {
    const method: PaymentMethod = {
      name: "Nequi",
      number: "3001234567",
      logo: "/payment/nequi-logo.png",
    };
    expect(method.name).toBe("Nequi");
    expect(method.number).toBe("3001234567");
  });

  it("PaymentInfo type has correct shape", () => {
    const info: PaymentInfo = {
      qr_urls: { basic: "/payment/QRBasico.png" },
      methods: [
        { name: "Nequi", number: "3001234567", logo: "/payment/nequi-logo.png" },
      ],
      account_holder: "NuncaCierro SAS",
    };
    expect(info.qr_urls.basic).toBe("/payment/QRBasico.png");
    expect(info.methods).toHaveLength(1);
    expect(info.account_holder).toBeTruthy();
  });

  it("PlanInfo type has correct shape", () => {
    const plan: PlanInfo = {
      key: "basic",
      label: "Básico",
      price: 60000,
      priceLabel: "$60.000",
      features: ["Feature 1"],
    };
    expect(plan.key).toBe("basic");
    expect(plan.price).toBe(60000);
  });
});
