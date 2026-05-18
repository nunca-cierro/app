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

export function useAgents(tenantId?: string): UseAgentsReturn {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = tenantId ? `?tenant_id=${tenantId}` : "";
      const data = await apiClient<Agent[]>(`/api/v1/agents${params}`);
      setAgents(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error al cargar agentes");
      }
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

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

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, isLoading, error, refetch: fetchAgents, createAgent };
}
