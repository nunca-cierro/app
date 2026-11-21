"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bot, ShieldAlert, Sparkles } from "lucide-react";
import type { Agent } from "@/lib/types";
import { MODELS_BY_PROVIDER } from "@/lib/schemas/agent";

interface AgentSettingsFormProps {
  agent: Agent;
  onSave: (data: {
    name: string;
    provider: "openai" | "groq";
    model: string;
    instructions: string;
    keywords_to_escalate: string[];
    fallback_message: string;
  }) => Promise<void>;
  isSaving: boolean;
}

const RECOMMENDED_INSTRUCTIONS =
  "Eres un asistente de atención y ventas profesional y cordial.\n" +
  "- Saluda con amabilidad mencionando el nombre del negocio.\n" +
  "- Responde de manera clara, natural y concisa en párrafos de máximo 2 a 3 líneas.\n" +
  "- Consulta y utiliza la información verificada de la Base de Conocimiento para responder sobre servicios, horarios y precios.\n" +
  "- Si el cliente muestra interés comercial o desea agendar, solicita sus datos y guíalo hacia la acción.\n" +
  "- Si no dispones de la información o el cliente solicita hablar con una persona, deriva cordialmente a un asesor humano.";

export function AgentSettingsForm({
  agent,
  onSave,
  isSaving,
}: AgentSettingsFormProps) {
  const [name, setName] = useState(agent.name || "");
  const [provider, setProvider] = useState<"openai" | "groq">(
    (agent.provider as "openai" | "groq") || "openai",
  );
  const [model, setModel] = useState(agent.model || "gpt-4o-mini");

  const [instructions, setInstructions] = useState(
    agent.business_config?.instructions || RECOMMENDED_INSTRUCTIONS,
  );

  const [keywordsText, setKeywordsText] = useState(
    (agent.business_config?.keywords_to_escalate || [
      "queja",
      "reclamo",
      "humano",
      "asesor",
      "gerente",
      "cotización",
    ]).join(", "),
  );

  const [fallbackMessage, setFallbackMessage] = useState(
    agent.business_config?.fallback_message ||
      "Un asesor humano te atenderá en breve. Por favor espera mientras te conectamos.",
  );

  const availableModels = MODELS_BY_PROVIDER[provider] ?? ["gpt-4o-mini"];

  const handleProviderChange = (newProvider: "openai" | "groq") => {
    setProvider(newProvider);
    const nextModels = MODELS_BY_PROVIDER[newProvider] ?? [];
    if (!nextModels.includes(model)) {
      setModel(nextModels[0] || "gpt-4o-mini");
    }
  };

  const parsedKeywords = keywordsText
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      name: name.trim() || agent.name,
      provider,
      model,
      instructions,
      keywords_to_escalate: parsedKeywords,
      fallback_message: fallbackMessage.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {/* ── 1. Modelo y Motor de IA ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="size-5 text-amber-500" />
            <CardTitle className="text-base font-semibold">
              Identidad y Motor de IA
            </CardTitle>
          </div>
          <CardDescription>
            Configuración del modelo de lenguaje que procesa las conversaciones.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="agent-name" className="text-sm font-medium">
              Nombre del agente
            </label>
            <Input
              id="agent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Asistente Virtual"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="agent-provider" className="text-sm font-medium">
                Proveedor
              </label>
              <select
                id="agent-provider"
                value={provider}
                onChange={(e) =>
                  handleProviderChange(e.target.value as "openai" | "groq")
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="openai">OpenAI (Recomendado)</option>
                <option value="groq">Groq (Ultra-rápido)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="agent-model" className="text-sm font-medium">
                Modelo
              </label>
              <select
                id="agent-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-md border border-muted bg-muted/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
            <Sparkles className="size-4 shrink-0 text-amber-500" />
            <span>
              Resiliencia activa: Si OpenAI presenta fallas o límites de cuota, el backend conmuta silenciosamente a Groq como respaldo.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. Instrucciones de Comportamiento ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Instrucciones de Comportamiento
              </CardTitle>
              <CardDescription className="mt-1">
                Define la personalidad, el tono de comunicación y las reglas de atención de tu asistente.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setInstructions(RECOMMENDED_INSTRUCTIONS)}
              className="text-xs"
            >
              Restaurar predeterminado
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <textarea
            id="agent-instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={9}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono text-xs leading-relaxed"
            placeholder="Escribe las directrices de atención del agente..."
          />
          <p className="text-xs text-muted-foreground">
            Los servicios, precios, horarios y catálogo se consultan automáticamente desde los documentos en la pestaña Base de Conocimiento.
          </p>
        </CardContent>
      </Card>

      {/* ── 3. Derivación a Humano ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-amber-500" />
            <CardTitle className="text-base font-semibold">
              Derivación a Humano y Notificaciones
            </CardTitle>
          </div>
          <CardDescription>
            Cuando el cliente mencione una de estas palabras o exprese interés en escalar, se activa el traspaso a un asesor y se notifica por Telegram.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="agent-keywords" className="text-sm font-medium">
              Palabras clave de escalamiento (separadas por coma)
            </label>
            <Input
              id="agent-keywords"
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              placeholder="humano, asesor, queja, reclamo, urgencia, cotización..."
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {parsedKeywords.map((kw, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {kw}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="agent-fallback-msg" className="text-sm font-medium">
              Mensaje automático mientras se conecta el asesor
            </label>
            <Input
              id="agent-fallback-msg"
              value={fallbackMessage}
              onChange={(e) => setFallbackMessage(e.target.value)}
              placeholder="Un asesor te atenderá en breve..."
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Botón Guardar ── */}
      <Button
        type="submit"
        disabled={isSaving}
        className="w-full sm:w-auto"
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Guardando cambios...
          </>
        ) : (
          "Guardar Cambios"
        )}
      </Button>
    </form>
  );
}
