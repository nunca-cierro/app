"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  promptFormSchema,
  type PromptFormValues,
} from "@/lib/schemas/agent";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Save, History, Loader2, CheckCircle2 } from "lucide-react";
import type { Prompt } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface PromptEditorProps {
  prompts: Prompt[];
  onCreatePrompt: (data: PromptFormValues) => Promise<void>;
  isSubmitting: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function PromptEditor({
  prompts,
  onCreatePrompt,
  isSubmitting,
}: PromptEditorProps) {
  const [showHistory, setShowHistory] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PromptFormValues>({
    resolver: zodResolver(promptFormSchema),
    defaultValues: {
      content: "",
      type: "system",
    },
  });

  const handleCreatePrompt = async (data: PromptFormValues) => {
    await onCreatePrompt(data);
    reset({ content: "", type: "system" });
  };

  const activePrompt = prompts.find((p) => p.active) ?? prompts[0];

  return (
    <div className="space-y-6">
      {/* ── Editor ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {activePrompt ? "Editar System Prompt" : "Crear System Prompt"}
          </CardTitle>
          {activePrompt && (
            <p className="text-xs text-muted-foreground">
              Versión activa: v{activePrompt.version} · Creado{" "}
              {new Date(activePrompt.created_at).toLocaleDateString("es-CO")}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(handleCreatePrompt)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <textarea
                {...register("content")}
                rows={12}
                placeholder="Escribe aquí el system prompt que define el comportamiento del bot..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
              />
              {errors.content && (
                <p className="text-xs text-destructive">
                  {errors.content.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Al guardar se creará una nueva versión (v
                {(activePrompt?.version ?? 0) + 1})
              </p>
              <Button type="submit" disabled={isSubmitting} size="sm">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 size-4" />
                    Guardar Nueva Versión
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Version History ── */}
      {prompts.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Historial de Versiones
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="mr-2 size-4" />
              {showHistory ? "Ocultar" : `${prompts.length} versiones`}
            </Button>
          </CardHeader>

          {showHistory && (
            <CardContent className="space-y-2">
              {prompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className={`rounded-md border p-3 text-sm ${
                    prompt.active ? "border-primary/30 bg-primary/5" : ""
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-medium">v{prompt.version}</span>
                    {prompt.active && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 className="size-3" />
                        Activo
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(prompt.created_at).toLocaleString("es-CO")}
                    </span>
                  </div>
                  <pre className="whitespace-pre-wrap text-xs text-muted-foreground line-clamp-3">
                    {prompt.content}
                  </pre>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
