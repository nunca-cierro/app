"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient, ApiError } from "@/lib/api";
import type { Agent } from "@/lib/types";
import type { AgentFormValues } from "@/lib/schemas/agent";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UseAgentsReturn {
  agents: Agent[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  createAgent: (data: AgentFormValues) => Promise<Agent>;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useAgents(
  skip = 0,
  limit = 10,
  tenantId?: string,
): UseAgentsReturn {
  void tenantId; // reserved for tenant-scoped filtering
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchCount, setRefetchCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    apiClient<Agent[]>(`/api/v1/agents?skip=${skip}&limit=${limit}`)
      .then((data) => {
        if (cancelled) return;
        setAgents(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : "Error al cargar los agentes",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [skip, limit, refetchCount]);

  const refetch = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setRefetchCount((c) => c + 1);
  }, []);

  const createAgent = useCallback(
    async (data: AgentFormValues): Promise<Agent> => {
      const agent = await apiClient<Agent>("/api/v1/agents", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setAgents((prev) => [agent, ...prev]);
      return agent;
    },
    [],
  );

  return { agents, isLoading, error, refetch, createAgent };
}
