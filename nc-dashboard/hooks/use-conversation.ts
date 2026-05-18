"use client";

import { useState, useEffect } from "react";
import { apiClient, ApiError } from "@/lib/api";
import type { Conversation, Message } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UseConversationReturn {
  conversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useConversation(id: string): UseConversationReturn {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      apiClient<Conversation>(`/api/v1/conversations/${id}`),
      apiClient<Message[]>(`/api/v1/conversations/${id}/messages`),
    ])
      .then(([convData, msgsData]) => {
        if (cancelled) return;
        setConversation(convData);
        setMessages(msgsData);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Error al cargar la conversación",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { conversation, messages, isLoading, error };
}
