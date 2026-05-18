"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient, ApiError } from "@/lib/api";
import type { PlatformConnection } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UsePlatformConnectionsReturn {
  connections: PlatformConnection[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  createConnection: (data: {
    tenant_id: string;
    platform_type: string;
    display_name: string;
    credentials: Record<string, unknown>;
    extra_data?: Record<string, unknown> | null;
    status?: string;
    is_primary?: boolean;
  }) => Promise<PlatformConnection>;
}

export interface UsePlatformConnectionReturn {
  connection: PlatformConnection | null;
  isLoading: boolean;
  error: string | null;
  updateConnection: (data: {
    display_name?: string;
    credentials?: Record<string, unknown> | null;
    extra_data?: Record<string, unknown> | null;
    status?: string;
    is_primary?: boolean;
  }) => Promise<PlatformConnection>;
  deleteConnection: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Hook: list                                                          */
/* ------------------------------------------------------------------ */

export function usePlatformConnections(
  platformType?: string,
): UsePlatformConnectionsReturn {
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchCount, setRefetchCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const params = platformType ? `?platform_type=${platformType}` : "";

    apiClient<PlatformConnection[]>(`/api/v1/platform-connections${params}`)
      .then((data) => {
        if (cancelled) return;
        setConnections(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Error al cargar conexiones",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [platformType, refetchCount]);

  const createConnection = useCallback(
    async (data: {
      platform_type: string;
      display_name: string;
      credentials: Record<string, unknown>;
      extra_data?: Record<string, unknown> | null;
      status?: string;
      is_primary?: boolean;
    }): Promise<PlatformConnection> => {
      const conn = await apiClient<PlatformConnection>(
        "/api/v1/platform-connections",
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      );
      setConnections((prev) => [conn, ...prev]);
      return conn;
    },
    [],
  );

  const refetch = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setRefetchCount((c) => c + 1);
  }, []);

  return {
    connections,
    isLoading,
    error,
    refetch,
    createConnection,
  };
}

/* ------------------------------------------------------------------ */
/*  Hook: single                                                        */
/* ------------------------------------------------------------------ */

export function usePlatformConnection(
  id: string,
): UsePlatformConnectionReturn {
  const [connection, setConnection] = useState<PlatformConnection | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    apiClient<PlatformConnection>(`/api/v1/platform-connections/${id}`)
      .then((data) => {
        if (cancelled) return;
        setConnection(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Error al cargar la conexión",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const updateConnection = useCallback(
    async (data: {
      display_name?: string;
      credentials?: Record<string, unknown> | null;
      extra_data?: Record<string, unknown> | null;
      status?: string;
      is_primary?: boolean;
    }): Promise<PlatformConnection> => {
      const updated = await apiClient<PlatformConnection>(
        `/api/v1/platform-connections/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        },
      );
      setConnection(updated);
      return updated;
    },
    [id],
  );

  const deleteConnection = useCallback(async () => {
    await apiClient(`/api/v1/platform-connections/${id}`, {
      method: "DELETE",
    });
    setConnection(null);
  }, [id]);

  return {
    connection,
    isLoading,
    error,
    updateConnection,
    deleteConnection,
  };
}
