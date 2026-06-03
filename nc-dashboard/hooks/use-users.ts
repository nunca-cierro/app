"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient, ApiError } from "@/lib/api";
import type { AdminUser } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UseUsersReturn {
  users: AdminUser[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  assignTenant: (userId: string, tenantId: string, role: string) => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useUsers(): UseUsersReturn {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchCount, setRefetchCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    apiClient<AdminUser[]>("/api/v1/admin/users")
      .then((data) => {
        if (cancelled) return;
        setUsers(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : "Error al cargar usuarios",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refetchCount]);

  const assignTenant = useCallback(
    async (userId: string, tenantId: string, role: string) => {
      await apiClient("/api/v1/admin/assign-tenant", {
        method: "POST",
        body: JSON.stringify({
          user_id: userId,
          tenant_id: tenantId,
          role,
        }),
      });
      // Refresh the user list to reflect changes
      setRefetchCount((c) => c + 1);
    },
    [],
  );

  const refetch = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setRefetchCount((c) => c + 1);
  }, []);

  return { users, isLoading, error, refetch, assignTenant };
}
