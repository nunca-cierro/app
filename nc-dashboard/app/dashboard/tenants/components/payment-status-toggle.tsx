"use client";

import { useState } from "react";
import { toast } from "sonner";

import { updatePaymentStatus } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import type { Tenant } from "@/lib/types";

interface PaymentStatusToggleProps {
  tenantId: string;
  currentStatus: string;
  onSuccess: (updatedTenant: Tenant) => void;
}

export function PaymentStatusToggle({
  tenantId,
  currentStatus,
  onSuccess,
}: PaymentStatusToggleProps) {
  const { user } = useAuth();
  const role = user?.current_role ?? user?.role;

  const [isLoading, setIsLoading] = useState(false);

  const isSuperadmin = role === "superadmin";

  if (!isSuperadmin) {
    return null;
  }

  const isActive = currentStatus === "active";

  async function handleToggle() {
    if (isLoading) return;

    const newStatus = isActive ? "inactive" : "active";

    setIsLoading(true);
    try {
      const updated = await updatePaymentStatus(tenantId, newStatus);
      toast.success(
        newStatus === "active"
          ? "Pago activado correctamente"
          : "Pago desactivado correctamente",
      );
      onSuccess(updated);
    } catch {
      toast.error("Error al cambiar el estado de pago");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isActive}
      disabled={isLoading}
      onClick={handleToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed ${
        isActive ? "bg-green-600" : "bg-input"
      }`}
    >
      <span
        className={`pointer-events-none block size-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
          isActive ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
