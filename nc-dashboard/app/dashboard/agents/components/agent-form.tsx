"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  agentFormSchema,
  type AgentFormValues,
  MODELS_BY_PROVIDER,
} from "@/lib/schemas/agent";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { Tenant } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface AgentFormProps {
  defaultValues?: Partial<AgentFormValues>;
  onSubmit: (data: AgentFormValues) => Promise<void>;
  isSubmitting: boolean;
  mode: "create" | "edit";
  tenants: Tenant[];
  tenantsLoading: boolean;
  selectedPlan?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Form                                                               */
/* ------------------------------------------------------------------ */

export function AgentForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  mode,
  tenants,
  tenantsLoading,
  selectedPlan,
}: AgentFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      tenant_id: "",
      name: "",
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 512,
      ...defaultValues,
    },
  });

  const selectedProvider = useWatch({ control, name: "provider" });
  const selectedTenantId = useWatch({ control, name: "tenant_id" });
  const currentTemperature = useWatch({ control, name: "temperature" });
  const availableModels = MODELS_BY_PROVIDER[selectedProvider] ?? [];

  /* ── Detect plan ── */
  const plan =
    selectedPlan ??
    (mode === "create" && selectedTenantId
      ? tenants.find((t) => t.id === selectedTenantId)?.plan ?? null
      : null);
  const isBasicOrTrial = plan === "basic" || plan === "trial";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* ── Tenant (solo en creación) ── */}
      {mode === "create" && (
        <div className="space-y-2">
          <label htmlFor="tenant_id" className="text-sm font-medium">
            Negocio
          </label>
          {tenantsLoading ? (
            <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Cargando negocios...
            </div>
          ) : (
            <select
              id="tenant_id"
              {...register("tenant_id")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Selecciona un negocio</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          {errors.tenant_id && (
            <p className="text-xs text-destructive">
              {errors.tenant_id.message}
            </p>
          )}
        </div>
      )}

      {/* ── Name ── */}
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Nombre del agente
        </label>
        <Input
          id="name"
          {...register("name")}
          placeholder="Ej: Atención al Cliente"
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {isBasicOrTrial ? (
        /* ── Plan básico/trial: sin IA ── */
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Plan {plan === "basic" ? "Básico" : "Trial"}: respuestas
          programadas sin IA. Configurá las respuestas en{" "}
          <strong>&ldquo;Respuestas programadas&rdquo;</strong>.
        </div>
      ) : (
        <>
          {/* ── Provider + Model ── */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="provider" className="text-sm font-medium">
                Proveedor
              </label>
              <select
                id="provider"
                {...register("provider")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="groq">Groq</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
              {errors.provider && (
                <p className="text-xs text-destructive">
                  {errors.provider.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="model" className="text-sm font-medium">
                Modelo
              </label>
              <select
                id="model"
                {...register("model")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {availableModels.length === 0 && (
                  <option value="">Sin modelos disponibles</option>
                )}
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              {errors.model && (
                <p className="text-xs text-destructive">{errors.model.message}</p>
              )}
            </div>
          </div>

          {/* ── Temperature + Max Tokens ── */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="temperature" className="text-sm font-medium">
                Temperatura ({currentTemperature})
              </label>
              <input
                id="temperature"
                type="range"
                min="0"
                max="2"
                step="0.1"
                {...register("temperature", { valueAsNumber: true })}
                className="w-full"
              />
              {errors.temperature && (
                <p className="text-xs text-destructive">
                  {errors.temperature.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="max_tokens" className="text-sm font-medium">
                Máx. tokens
              </label>
              <Input
                id="max_tokens"
                type="number"
                {...register("max_tokens", { valueAsNumber: true })}
                min={64}
                max={8192}
              />
              {errors.max_tokens && (
                <p className="text-xs text-destructive">
                  {errors.max_tokens.message}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Submit ── */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full sm:w-auto"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            {mode === "create" ? "Creando..." : "Guardando..."}
          </>
        ) : mode === "create" ? (
          "Crear Agente"
        ) : (
          "Guardar Cambios"
        )}
      </Button>
    </form>
  );
}
