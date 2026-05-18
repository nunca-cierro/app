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

  const fetchTenants = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = filterStatus ? `?status=${filterStatus}` : "";
      const data = await apiClient<Tenant[]>(`/api/v1/tenants${params}`);
      setTenants(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error al cargar negocios");
      }
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus]);

  const createTenant = useCallback(
    async (data: TenantFormValues): Promise<Tenant> => {
      const tenant = await apiClient<Tenant>("/api/v1/tenants", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          slug: slugify(data.name),   // ← auto-generado
        }),
      });
      setTenants((prev) => [tenant, ...prev]);
      return tenant;
    },
    [],
  );

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  return { tenants, isLoading, error, refetch: fetchTenants, createTenant };
}
