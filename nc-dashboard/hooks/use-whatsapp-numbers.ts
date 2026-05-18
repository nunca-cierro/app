"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient, ApiError } from "@/lib/api";
import type { WhatsAppNumber } from "@/lib/types";
import type { WhatsAppNumberFormValues } from "@/lib/schemas/whatsapp";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UseWhatsAppNumbersReturn {
  numbers: WhatsAppNumber[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  createNumber: (data: WhatsAppNumberFormValues) => Promise<WhatsAppNumber>;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useWhatsAppNumbers(
  tenantId?: string,
): UseWhatsAppNumbersReturn {
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchCount, setRefetchCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const params = tenantId ? `?tenant_id=${tenantId}` : "";

    apiClient<WhatsAppNumber[]>(`/api/v1/whatsapp-numbers${params}`)
      .then((data) => {
        if (cancelled) return;
        setNumbers(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Error al cargar números WhatsApp",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId, refetchCount]);

  const createNumber = useCallback(
    async (data: WhatsAppNumberFormValues): Promise<WhatsAppNumber> => {
      const number = await apiClient<WhatsAppNumber>(
        "/api/v1/whatsapp-numbers",
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      );
      setNumbers((prev) => [number, ...prev]);
      return number;
    },
    [],
  );

  const refetch = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setRefetchCount((c) => c + 1);
  }, []);

  return {
    numbers,
    isLoading,
    error,
    refetch,
    createNumber,
  };
}
