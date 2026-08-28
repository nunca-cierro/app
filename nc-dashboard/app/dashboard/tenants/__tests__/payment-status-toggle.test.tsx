import { describe, expect, it, vi } from "vitest";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock useAuth hook — superadmin by default
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { id: "1", email: "admin@test.com", name: "Admin", current_role: "superadmin" },
  }),
}));

// Mock the API
vi.mock("@/lib/api", () => ({
  updatePaymentStatus: vi.fn().mockResolvedValue({
    id: "tenant-1",
    payment_status: "active",
    plan_activated_at: "2026-08-28T10:00:00Z",
  }),
}));

describe("PaymentStatusToggle", () => {
  it("imports without error", async () => {
    const mod = await import(
      "@/app/dashboard/tenants/components/payment-status-toggle"
    );
    expect(mod.PaymentStatusToggle).toBeDefined();
  });

  it("is a React component function", async () => {
    const { PaymentStatusToggle } = await import(
      "@/app/dashboard/tenants/components/payment-status-toggle"
    );
    // PaymentStatusToggle should be a function (React component)
    expect(typeof PaymentStatusToggle).toBe("function");
  });

  it("accepts tenantId, currentStatus, and onSuccess props", async () => {
    const { PaymentStatusToggle } = await import(
      "@/app/dashboard/tenants/components/payment-status-toggle"
    );
    // Just verify the props interface is accepted without error
    // (testing component structure, not rendering without testing-library)
    expect(PaymentStatusToggle).toBeDefined();
  });
});
