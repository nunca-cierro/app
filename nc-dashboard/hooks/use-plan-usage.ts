"use client";

import { useCallback, useEffect, useState } from "react";
import { getPlanUsage, ApiError } from "@/lib/api";
import type { PlanUsage } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UsePlanUsageReturn {
  data: PlanUsage | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/* ------------------------------------------------------------------ */
/*  Pure helper (testable without rendering)                           */
/* ------------------------------------------------------------------ */

/**
 * Fetch gate: without an active tenant there is nothing to meter (the
 * backend answers 404 "No active tenant"), so the hook skips the fetch
 * and stays idle — the widget degrades gracefully instead of surfacing
 * an error on a dashboard that has no tenant context.
 */
export async function loadPlanUsage(
  tenantId: string | null | undefined,
  fetchUsage: () => Promise<PlanUsage>,
): Promise<PlanUsage | null> {
  if (!tenantId) return null;
  return fetchUsage();
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

/**
 * Consumo del plan del tenant ACTIVO (`current_tenant_id`). Refetchea
 * cuando cambia el tenant (tenant switch) o vía `refetch()`. Al cambiar
 * de tenant descarta los contadores previos mientras refetchea. Ante
 * fallo de API degrada: `error` amigable, `data` null — el widget se
 * oculta y el dashboard sigue operativo (spec WidgetApiErrorGraceful).
 */
export function usePlanUsage(
  tenantId: string | null | undefined,
): UsePlanUsageReturn {
  const [data, setData] = useState<PlanUsage | null>(null);
  // Sin tenant activo no hay fetch pendiente → idle desde el inicio.
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(tenantId));
  const [error, setError] = useState<string | null>(null);
  const [refetchCount, setRefetchCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!tenantId) {
      // Sin tenant activo: sin datos previos ni fetch pendiente.
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    // Cambio de tenant → descartar contadores previos mientras se
    // refetchea (spec TenantSwitchPreservesCounters).
    setData(null);
    setError(null);
    setIsLoading(true);

    loadPlanUsage(tenantId, getPlanUsage)
      .then((usage) => {
        if (cancelled || usage === null) return;
        setData(usage);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "No se pudo cargar el uso del plan",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId, refetchCount]);

  const refetch = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setRefetchCount((c) => c + 1);
  }, []);

  return { data, isLoading, error, refetch };
}