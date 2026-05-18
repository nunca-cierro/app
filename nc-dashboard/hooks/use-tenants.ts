"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient, ApiError } from "@/lib/api";
import type { Tenant } from "@/lib/types";
import type { TenantFormValues } from "@/lib/schemas/tenant";
import { slugify } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UseTenantsReturn {
  tenants: Tenant[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  createTenant: (data: TenantFormValues) => Promise<Tenant>;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useTenants(filterStatus?: string): UseTenantsReturn {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchCount, setRefetchCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const params = filterStatus ? `?status=${filterStatus}` : "";

    apiClient<Tenant[]>(`/api/v1/tenants${params}`)
      .then((data) => {
        if (cancelled) return;
        setTenants(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : "Error al cargar negocios",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filterStatus, refetchCount]);

  const createTenant = useCallback(
    async (data: TenantFormValues): Promise<Tenant> => {
      const tenant = await apiClient<Tenant>("/api/v1/tenants", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          slug: slugify(data.name), // ← auto-generado
        }),
      });
      setTenants((prev) => [tenant, ...prev]);
      return tenant;
    },
    [],
  );

  const refetch = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setRefetchCount((c) => c + 1);
  }, []);

  return { tenants, isLoading, error, refetch, createTenant };
}
