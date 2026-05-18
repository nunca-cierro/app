"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient, ApiError } from "@/lib/api";
import type { Tenant } from "@/lib/types";
import type { TenantFormValues } from "@/lib/schemas/tenant";
import { slugify } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UseTenantReturn {
  tenant: Tenant | null;
  isLoading: boolean;
  error: string | null;
  updateTenant: (data: TenantFormValues) => Promise<Tenant>;
  deleteTenant: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useTenant(id: string): UseTenantReturn {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    apiClient<Tenant>(`/api/v1/tenants/${id}`)
      .then((data) => {
        if (cancelled) return;
        setTenant(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : "Error al cargar el negocio",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const updateTenant = useCallback(
    async (data: TenantFormValues): Promise<Tenant> => {
      const updated = await apiClient<Tenant>(`/api/v1/tenants/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...data,
          slug: slugify(data.name), // ← auto-generado
        }),
      });
      setTenant(updated);
      return updated;
    },
    [id],
  );

  const deleteTenant = useCallback(async () => {
    await apiClient(`/api/v1/tenants/${id}`, { method: "DELETE" });
    setTenant(null);
  }, [id]);

  return { tenant, isLoading, error, updateTenant, deleteTenant };
}
