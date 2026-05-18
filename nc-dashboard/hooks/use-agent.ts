"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient, ApiError } from "@/lib/api";
import type { Agent, Prompt } from "@/lib/types";
import type { AgentFormValues, PromptFormValues } from "@/lib/schemas/agent";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UseAgentReturn {
  agent: Agent | null;
  prompts: Prompt[];
  isLoading: boolean;
  error: string | null;
  updateAgent: (data: AgentFormValues) => Promise<Agent>;
  deleteAgent: () => Promise<void>;
  createPrompt: (data: PromptFormValues) => Promise<Prompt>;
  promptsLoading: boolean;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useAgent(id: string): UseAgentReturn {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      apiClient<Agent>(`/api/v1/agents/${id}`),
      apiClient<Prompt[]>(`/api/v1/agents/${id}/prompts`),
    ])
      .then(([agentData, promptsData]) => {
        if (cancelled) return;
        setAgent(agentData);
        setPrompts(promptsData);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : "Error al cargar el agente",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const updateAgent = useCallback(
    async (data: AgentFormValues): Promise<Agent> => {
      const updated = await apiClient<Agent>(`/api/v1/agents/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      setAgent(updated);
      return updated;
    },
    [id],
  );

  const deleteAgent = useCallback(async () => {
    await apiClient(`/api/v1/agents/${id}`, { method: "DELETE" });
    setAgent(null);
  }, [id]);

  const createPrompt = useCallback(
    async (data: PromptFormValues): Promise<Prompt> => {
      setPromptsLoading(true);
      try {
        const prompt = await apiClient<Prompt>(
          `/api/v1/agents/${id}/prompts`,
          {
            method: "POST",
            body: JSON.stringify(data),
          },
        );
        setPrompts((prev) => [prompt, ...prev]);
        return prompt;
      } finally {
        setPromptsLoading(false);
      }
    },
    [id],
  );

  return {
    agent,
    prompts,
    isLoading,
    error,
    updateAgent,
    deleteAgent,
    createPrompt,
    promptsLoading,
  };
}
