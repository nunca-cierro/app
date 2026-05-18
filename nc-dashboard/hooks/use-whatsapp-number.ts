"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient, ApiError } from "@/lib/api";
import type { WhatsAppNumber } from "@/lib/types";
import type { WhatsAppNumberFormValues } from "@/lib/schemas/whatsapp";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UseWhatsAppNumberReturn {
  number: WhatsAppNumber | null;
  isLoading: boolean;
  error: string | null;
  updateNumber: (data: WhatsAppNumberFormValues) => Promise<WhatsAppNumber>;
  deleteNumber: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useWhatsAppNumber(id: string): UseWhatsAppNumberReturn {
  const [number, setNumber] = useState<WhatsAppNumber | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNumber = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient<WhatsAppNumber>(
        `/api/v1/whatsapp-numbers/${id}`,
      );
      setNumber(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error al cargar el número");
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const updateNumber = useCallback(
    async (data: WhatsAppNumberFormValues): Promise<WhatsAppNumber> => {
      const updated = await apiClient<WhatsAppNumber>(
        `/api/v1/whatsapp-numbers/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        },
      );
      setNumber(updated);
      return updated;
    },
    [id],
  );

  const deleteNumber = useCallback(async () => {
    await apiClient(`/api/v1/whatsapp-numbers/${id}`, { method: "DELETE" });
    setNumber(null);
  }, [id]);

  useEffect(() => {
    fetchNumber();
  }, [fetchNumber]);

  return { number, isLoading, error, updateNumber, deleteNumber };
}
