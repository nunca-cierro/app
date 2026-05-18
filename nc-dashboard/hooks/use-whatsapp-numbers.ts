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

  const fetchNumbers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = tenantId ? `?tenant_id=${tenantId}` : "";
      const data = await apiClient<WhatsAppNumber[]>(
        `/api/v1/whatsapp-numbers${params}`,
      );
      setNumbers(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error al cargar números WhatsApp");
      }
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

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

  useEffect(() => {
    fetchNumbers();
  }, [fetchNumbers]);

  return {
    numbers,
    isLoading,
    error,
    refetch: fetchNumbers,
    createNumber,
  };
}
