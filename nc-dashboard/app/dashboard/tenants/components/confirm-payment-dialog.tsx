"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PaymentStatusBadge } from "@/app/dashboard/tenants/components/payment-status-badge";
import { Badge } from "@/components/ui/badge";
import { apiClient, ApiError } from "@/lib/api";
import { PLAN_LABELS } from "@/lib/plans";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Tenant } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Plan options                                                        */
/* ------------------------------------------------------------------ */

const PLAN_OPTIONS = [
  { value: "basic", label: "Básico", price: 60000 },
  { value: "professional", label: "Profesional", price: 120000 },
  { value: "enterprise", label: "Empresarial", price: 250000 },
] as const;

function formatPrice(price: number): string {
  return `$${price.toLocaleString("es-CO")}`;
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface ConfirmPaymentDialogProps {
  tenant: Tenant;
  onSuccess?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ConfirmPaymentDialog({
  tenant,
  onSuccess,
}: ConfirmPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("professional");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ── Confirm handler ── */
  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await apiClient(`/api/v1/tenants/${tenant.id}/activate-plan`, {
        method: "PATCH",
        body: JSON.stringify({ plan: selectedPlan }),
      });
      toast.success("Pago confirmado y plan activado exitosamente");
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Error de conexión al confirmar el pago.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          Confirmar Pago
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar Pago</DialogTitle>
          <DialogDescription>
            Activá un plan para este negocio luego de recibir el comprobante de
            pago.
          </DialogDescription>
        </DialogHeader>

        {/* ── Tenant info ── */}
        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Negocio</span>
            <span className="text-sm font-medium">{tenant.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Plan actual</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {PLAN_LABELS[tenant.plan] ?? tenant.plan}
              </Badge>
              <PaymentStatusBadge status={tenant.payment_status} />
            </div>
          </div>
        </div>

        {/* ── Plan selector ── */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Activar plan</label>
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {PLAN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} — {formatPrice(option.price)}
              </option>
            ))}
          </select>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Activando...
              </>
            ) : (
              "Confirmar y Activar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
