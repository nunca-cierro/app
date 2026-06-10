"use client";

import { useState, useCallback } from "react";
import { apiClient, ApiError } from "@/lib/api";
import type { AutoReply, AutoReplyCreate, AutoReplyUpdate } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UseAutoRepliesReturn {
  autoReplies: AutoReply[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  listByTenant: (tenantId: string) => Promise<AutoReply[]>;
  create: (data: AutoReplyCreate) => Promise<AutoReply>;
  update: (id: string, data: AutoReplyUpdate) => Promise<AutoReply>;
  remove: (id: string) => Promise<void>;
  toggle: (id: string) => Promise<AutoReply>;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useAutoReplies(): UseAutoRepliesReturn {
  const [autoReplies, setAutoReplies] = useState<AutoReply[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* No auto-fetch — caller uses listByTenant */

  const refetch = useCallback(() => {
    setError(null);
  }, []);

  const listByTenant = useCallback(
    async (tenantId: string): Promise<AutoReply[]> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiClient<AutoReply[]>(
          `/api/v1/auto-replies?tenant_id=${tenantId}`,
        );
        setAutoReplies(data);
        return data;
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : "Error al cargar respuestas programadas";
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const create = useCallback(
    async (data: AutoReplyCreate): Promise<AutoReply> => {
      const reply = await apiClient<AutoReply>("/api/v1/auto-replies", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setAutoReplies((prev) => [reply, ...prev]);
      return reply;
    },
    [],
  );

  const update = useCallback(
    async (id: string, data: AutoReplyUpdate): Promise<AutoReply> => {
      const updated = await apiClient<AutoReply>(`/api/v1/auto-replies/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      setAutoReplies((prev) =>
        prev.map((r) => (r.id === id ? updated : r)),
      );
      return updated;
    },
    [],
  );

  const remove = useCallback(async (id: string): Promise<void> => {
    await apiClient(`/api/v1/auto-replies/${id}`, { method: "DELETE" });
    setAutoReplies((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const toggle = useCallback(
    async (id: string): Promise<AutoReply> => {
      const current = autoReplies.find((r) => r.id === id);
      if (!current) throw new Error("AutoReply not found");
      const updated = await apiClient<AutoReply>(
        `/api/v1/auto-replies/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ enabled: !current.enabled }),
        },
      );
      setAutoReplies((prev) =>
        prev.map((r) => (r.id === id ? updated : r)),
      );
      return updated;
    },
    [autoReplies],
  );

  return {
    autoReplies,
    isLoading,
    error,
    refetch,
    listByTenant,
    create,
    update,
    remove,
    toggle,
  };
}
