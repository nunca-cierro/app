"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient, ApiError } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
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
  refetch: () => void;
}

/* ------------------------------------------------------------------ */
/*  Pure: PATCH body builder (testable without rendering)              */
/* ------------------------------------------------------------------ */

/**
 * Build the PATCH /tenants/{id} body for a role.
 *
 * Client (T5/owner decision #1): ONLY business-card fields {name, timezone,
 * locale, notes} — the backend rejects plan/slug/business_profile for client
 * with 403, so they are never sent. Admin/superadmin keep the full form plus
 * the auto-generated slug (schema-ignored by the backend, kept for parity).
 */
export function buildTenantPatchBody(
  data: TenantFormValues,
  role: string | null | undefined,
): Record<string, unknown> {
  if (role === "client") {
    return {
      name: data.name,
      timezone: data.timezone,
      locale: data.locale,
      notes: data.notes ?? null,
    };
  }
  return { ...data, slug: slugify(data.name) };
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useTenant(id: string): UseTenantReturn {
  const { user } = useAuth();
  const effectiveRole = user?.current_role ?? user?.role;
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchCount, setRefetchCount] = useState(0);

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
  }, [id, refetchCount]);

  const updateTenant = useCallback(
    async (data: TenantFormValues): Promise<Tenant> => {
      const updated = await apiClient<Tenant>(`/api/v1/tenants/${id}`, {
        method: "PATCH",
        body: JSON.stringify(buildTenantPatchBody(data, effectiveRole)),
      });
      setTenant(updated);
      return updated;
    },
    [id, effectiveRole],
  );

  const deleteTenant = useCallback(async () => {
    await apiClient(`/api/v1/tenants/${id}`, { method: "DELETE" });
    setTenant(null);
  }, [id]);

  const refetch = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setRefetchCount((c) => c + 1);
  }, []);

  return { tenant, isLoading, error, updateTenant, deleteTenant, refetch };
}
