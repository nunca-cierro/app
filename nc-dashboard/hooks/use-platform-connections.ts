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
  fetchEvolutionInstances: (
    baseUrl: string,
    apiKey?: string,
  ) => Promise<any[]>;
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
  registerWebhook: (baseUrlOverride?: string) => Promise<{ webhook_url: string }>;
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

  const fetchEvolutionInstances = useCallback(
    async (baseUrl: string, apiKey?: string): Promise<any[]> => {
      const params = new URLSearchParams({ base_url: baseUrl });
      if (apiKey) params.append("api_key", apiKey);

      return apiClient<any[]>(
        `/api/v1/platform-connections/evolution-fetch-instances?${params.toString()}`,
      );
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
    fetchEvolutionInstances,
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
    if (!id || id === "undefined") return;

    let cancelled = false;
    setIsLoading(true);

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

  const registerWebhook = useCallback(async (baseUrlOverride?: string) => {
    // We fetch the current connection state to ensure we have the platform_type
    const currentConn = await apiClient<PlatformConnection>(`/api/v1/platform-connections/${id}`);
    
    const endpoint = currentConn.platform_type === "evolution" 
      ? `/api/v1/platform-connections/${id}/register-evolution-webhook`
      : `/api/v1/platform-connections/${id}/register-webhook`;
    
    const urlWithParams = baseUrlOverride 
      ? `${endpoint}?base_url_override=${encodeURIComponent(baseUrlOverride)}`
      : endpoint;

    const result = await apiClient<{ webhook_url: string }>(
      urlWithParams,
      { method: "POST" },
    );
    
    // Refresh local state with updated data
    const updated = await apiClient<PlatformConnection>(`/api/v1/platform-connections/${id}`);
    setConnection(updated);
    return result;
  }, [id]);

  return {
    connection,
    isLoading,
    error,
    updateConnection,
    deleteConnection,
    registerWebhook,
  };
}
