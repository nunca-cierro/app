"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient, ApiError } from "@/lib/api";
import type { AgentTemplate } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UseAgentTemplatesReturn {
  templates: AgentTemplate[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useAgentTemplates(
  category?: string,
): UseAgentTemplatesReturn {
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchCount, setRefetchCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const queryParams = category
      ? `?category=${encodeURIComponent(category)}`
      : "";

    apiClient<AgentTemplate[]>(
      `/api/v1/agent-templates${queryParams}`,
    )
      .then((data) => {
        if (cancelled) return;
        setTemplates(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Error al cargar plantillas",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [category, refetchCount]);

  const refetch = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setRefetchCount((c) => c + 1);
  }, []);

  return { templates, isLoading, error, refetch };
}
