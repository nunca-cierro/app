"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  agentFormSchema,
  agentEditFormSchema,
  defaultAgentValues,
  MODELS_BY_PROVIDER,
  type AgentFormValues,
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
    setValue,
    getValues,
    formState: { errors },
  } = useForm<AgentFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(mode === "edit" ? agentEditFormSchema : agentFormSchema) as any,
    defaultValues: {
      ...defaultAgentValues,
      // The form intentionally preselects a warmer temperature than the
      // storage default (0) — agents created from the UI start at 0.7.
      temperature: 0.7,
      ...defaultValues,
    },
  });

  const selectedTenantId = useWatch({ control, name: "tenant_id" });
  const currentTemperature = useWatch({ control, name: "temperature" });
  const currentMaxTokens = useWatch({ control, name: "max_tokens" });
  const currentProvider = useWatch({ control, name: "provider" });
  const currentModel = useWatch({ control, name: "model" });

  // Models for the currently selected provider — keeps the model dropdown in
  // sync with the backend's supported providers (openai + groq).
  const availableModels = MODELS_BY_PROVIDER[currentProvider] ?? [];

  const handleProviderChange = (provider: string) => {
    const nextModels = MODELS_BY_PROVIDER[provider] ?? [];
    const current = getValues("model");
    setValue("provider", provider as "openai" | "groq");
    // When the stored model is not offered by the newly selected provider,
    // fall back to that provider's first available model.
    if (!nextModels.includes(current)) {
      setValue("model", nextModels[0] ?? "");
    }
  };

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
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 space-y-2">
          <p>
            <strong>Plan {plan === "basic" ? "Básico" : "Trial"}</strong> — sin
            inteligencia artificial.
          </p>
          <p className="text-amber-700">
            Las respuestas se generan automáticamente buscando coincidencias
            entre lo que pregunta el cliente y las{" "}
            <strong>Preguntas Frecuentes (FAQ)</strong> que configures en la
            pestaña <strong>Negocio</strong>. También se usan las palabras clave
            de derivación para escalar a un humano cuando sea necesario.
          </p>
        </div>
      ) : (
        <>
          {/* Provider — selectable (openai default, groq optional) */}
          <div className="space-y-2">
            <label htmlFor="provider" className="text-sm font-medium">
              Proveedor
            </label>
            <select
              id="provider"
              {...register("provider", {
                onChange: (e) => handleProviderChange(e.target.value),
              })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="openai">OpenAI</option>
              <option value="groq">Groq</option>
            </select>
            {errors.provider && (
              <p className="text-xs text-destructive">
                {errors.provider.message}
              </p>
            )}
          </div>

          {/* Model — filtered by the selected provider */}
          <div className="space-y-2">
            <label htmlFor="model" className="text-sm font-medium">
              Modelo
            </label>
            <select
              id="model"
              {...register("model")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {!availableModels.includes(currentModel) && (
                <option value={currentModel}>{currentModel}</option>
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

          {/* Temperature */}
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
            <p className="text-xs text-muted-foreground">
              0 = respuestas precisas y consistentes (recomendado para info de negocio).
            </p>
            {errors.temperature && (
              <p className="text-xs text-destructive">
                {errors.temperature.message}
              </p>
            )}
          </div>

          {/* Max tokens — stored value */}
          <div className="space-y-2">
            <label htmlFor="max_tokens" className="text-sm font-medium">
              Máx. tokens
            </label>
            <Input
              id="max_tokens"
              type="number"
              value={currentMaxTokens}
              disabled
              className="bg-muted/50 text-muted-foreground"
            />
            <input
              type="hidden"
              {...register("max_tokens", { valueAsNumber: true })}
              value={currentMaxTokens}
            />
            <p className="text-xs text-muted-foreground">
              {currentMaxTokens} tokens configurados.
            </p>
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
