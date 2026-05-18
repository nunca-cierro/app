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
    platform: string;
    display_name: string;
    config: Record<string, unknown>;
  }) => Promise<PlatformConnection>;
}

export interface UsePlatformConnectionReturn {
  connection: PlatformConnection | null;
  isLoading: boolean;
  error: string | null;
  updateConnection: (data: {
    display_name?: string;
    config?: Record<string, unknown>;
    status?: string;
  }) => Promise<PlatformConnection>;
  deleteConnection: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Hook: list                                                          */
/* ------------------------------------------------------------------ */

export function usePlatformConnections(
  platform?: string,
): UsePlatformConnectionsReturn {
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = platform ? `?platform=${platform}` : "";
      const data = await apiClient<PlatformConnection[]>(
        `/api/v1/platform-connections${params}`,
      );
      setConnections(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error al cargar conexiones");
      }
    } finally {
      setIsLoading(false);
    }
  }, [platform]);

  const createConnection = useCallback(
    async (data: {
      platform: string;
      display_name: string;
      config: Record<string, unknown>;
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

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  return {
    connections,
    isLoading,
    error,
    refetch: fetchConnections,
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

  const fetchConnection = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient<PlatformConnection>(
        `/api/v1/platform-connections/${id}`,
      );
      setConnection(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error al cargar la conexión");
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const updateConnection = useCallback(
    async (data: {
      display_name?: string;
      config?: Record<string, unknown>;
      status?: string;
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

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  return {
    connection,
    isLoading,
    error,
    updateConnection,
    deleteConnection,
  };
}
