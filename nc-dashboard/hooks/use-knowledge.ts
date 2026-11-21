"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient, ApiError } from "@/lib/api";
import { toast } from "sonner";

export interface KnowledgeDocument {
  id: string;
  title: string;
  source_type: string;
  source_url: string | null;
  raw_markdown?: string;
  status: string;
  created_at: string;
}

export interface ExtractResponse {
  title: string;
  markdown: string;
  source: string;
}

export function useKnowledge() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchCount, setRefetchCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    apiClient<KnowledgeDocument[]>("/api/v1/knowledge/documents")
      .then((data) => {
        if (cancelled) return;
        setDocuments(data || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : "Error al cargar documentos",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refetchCount]);

  const refetch = useCallback(() => {
    setIsLoading(true);
    setRefetchCount((c) => c + 1);
  }, []);

  const extractUrl = async (url: string): Promise<ExtractResponse> => {
    return apiClient<ExtractResponse>("/api/v1/knowledge/extract-url", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
  };

  const extractFile = async (file: File): Promise<ExtractResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient<ExtractResponse>("/api/v1/knowledge/extract-file", {
      method: "POST",
      body: formData,
    });
  };

  const saveDocument = async (payload: {
    title: string;
    source_type: string;
    raw_markdown: string;
    source_url?: string | null;
  }): Promise<void> => {
    await apiClient("/api/v1/knowledge/documents", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    toast.success("Documento indexado exitosamente");
    refetch();
  };

  const updateDocument = async (
    id: string,
    payload: { title: string; raw_markdown: string },
  ): Promise<void> => {
    await apiClient(`/api/v1/knowledge/documents/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    toast.success("Documento actualizado e indexado exitosamente");
    refetch();
  };

  const resyncDocument = async (id: string): Promise<ExtractResponse> => {
    return apiClient<ExtractResponse>(`/api/v1/knowledge/documents/${id}/resync`, {
      method: "POST",
    });
  };

  const deleteDocument = async (id: string): Promise<void> => {
    await apiClient(`/api/v1/knowledge/documents/${id}`, {
      method: "DELETE",
    });
    toast.success("Documento eliminado");
    refetch();
  };

  return {
    documents,
    isLoading,
    error,
    extractUrl,
    extractFile,
    saveDocument,
    updateDocument,
    resyncDocument,
    deleteDocument,
    refetch,
  };
}
