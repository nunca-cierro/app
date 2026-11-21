"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Pause, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isLoading) return;

    const newStatus = isActive ? "inactive" : "active";

    setIsLoading(true);
    try {
      const updated = await updatePaymentStatus(tenantId, newStatus);
      toast.success(
        newStatus === "active"
          ? "Plan activado por 1 mes calendario"
          : "Suscripción pausada correctamente",
      );
      onSuccess(updated);
    } catch {
      toast.error("Error al actualizar la suscripción");
    } finally {
      setIsLoading(false);
    }
  }

  if (isActive) {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={isLoading}
        onClick={handleToggle}
        className="h-7 text-xs px-2 text-muted-foreground hover:text-destructive"
        title="Pausar suscripción"
      >
        {isLoading ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <>
            <Pause className="mr-1 size-3" />
            Pausar
          </>
        )}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="default"
      disabled={isLoading}
      onClick={handleToggle}
      className="h-7 text-xs px-2.5 font-medium bg-amber-600 hover:bg-amber-700 text-white"
      title="Activar plan por 1 mes calendario"
    >
      {isLoading ? (
        <Loader2 className="mr-1 size-3 animate-spin" />
      ) : (
        <Check className="mr-1 size-3" />
      )}
      Activar Mes
    </Button>
  );
}
