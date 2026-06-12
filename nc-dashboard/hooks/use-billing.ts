"use client";

import { useState, useCallback } from "react";
import { apiClient, ApiError } from "@/lib/api";
import type { PaymentInfo } from "@/lib/types/billing";

/* ------------------------------------------------------------------ */
/*  Hook to fetch payment info from GET /api/v1/billing/payment-info   */
/* ------------------------------------------------------------------ */

export function useBilling() {
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentInfo = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient<PaymentInfo>("/api/v1/billing/payment-info");
      setPaymentInfo(data);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Error al cargar información de pago";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { paymentInfo, isLoading, error, fetchPaymentInfo };
}
