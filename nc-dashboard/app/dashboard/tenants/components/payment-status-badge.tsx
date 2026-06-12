"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

interface StatusStyle {
  label: string;
  className: string;
}

const STATUS_CONFIG: Record<string, StatusStyle> = {
  pending: {
    label: "Pendiente",
    className: "border-amber-300 text-amber-700 bg-amber-50",
  },
  active: {
    label: "Activo",
    className: "border-green-300 text-green-700 bg-green-50",
  },
  overdue: {
    label: "Vencido",
    className: "border-red-300 text-red-700 bg-red-50",
  },
  suspended: {
    label: "Suspendido",
    className: "border-gray-300 text-gray-500 bg-gray-50",
  },
};

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface PaymentStatusBadgeProps {
  status: string | null | undefined;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  if (!status) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const config = STATUS_CONFIG[status];
  if (!config) return null;

  return (
    <Badge variant="outline" className={cn(config.className)}>
      {config.label}
    </Badge>
  );
}
