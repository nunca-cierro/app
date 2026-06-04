"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useAgents } from "@/hooks/use-agents";
import {
  evolutionFormSchema,
  type EvolutionFormValues,
} from "@/lib/schemas/evolution";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { Tenant } from "@/lib/types";

interface EvolutionFormProps {
  defaultValues?: Partial<EvolutionFormValues>;
  onSubmit: (data: EvolutionFormValues) => Promise<void>;
  isSubmitting: boolean;
  mode: "create" | "edit";
  tenants: Tenant[];
  tenantsLoading: boolean;
}

export function EvolutionForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  mode,
  tenants,
  tenantsLoading,
}: EvolutionFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<EvolutionFormValues>({
    resolver: zodResolver(evolutionFormSchema),
    defaultValues: {
      tenant_id: "",
      display_name: "WhatsApp Evolution",
      status: "active",
      ...defaultValues,
    },
  });

  const watchedTenantId = useWatch({ control, name: "tenant_id" });
  const watchedDisplayName = useWatch({ control, name: "display_name" });
  const { agents, isLoading: agentsLoading } = useAgents(0, 100, watchedTenantId);

  // Auto-fill display_name with tenant name when tenant changes
  const selectedTenant = tenants.find((t) => t.id === watchedTenantId);
  useEffect(() => {
    if (selectedTenant) {
      // Only auto-fill if the field is empty or still the default
      if (!watchedDisplayName || watchedDisplayName === "WhatsApp Evolution") {
        setValue("display_name", selectedTenant.name);
      }
    }
  }, [selectedTenant?.id, setValue]);

  // Auto-select agent if only one exists for this tenant
  useEffect(() => {
    if (!agentsLoading && agents.length === 1 && watchedTenantId) {
      setValue("agent_id", agents[0].id);
    }
  }, [agents, agentsLoading, watchedTenantId, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* ── 1. Internal Mapping (Negocio) ── */
      /* La URL de Evolution y API Key se auto-completan desde el backend. */}
        <div className="space-y-2">
          <label htmlFor="tenant_id" className="text-sm font-medium">
            ¿A qué negocio pertenece esta conexión?
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
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
            <p className="text-xs text-destructive">{errors.tenant_id.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="agent_id" className="text-sm font-medium">
            Agente vinculado (Opcional)
          </label>
          {agentsLoading ? (
            <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Cargando agentes...
            </div>
          ) : (
            <select
              id="agent_id"
              {...register("agent_id")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={!watchedTenantId}
            >
              <option value="">
                {watchedTenantId
                  ? "Selecciona un agente (predeterminado del negocio)"
                  : "Selecciona un negocio primero"}
              </option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          )}
          {errors.agent_id && (
            <p className="text-xs text-destructive">{errors.agent_id.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="display_name" className="text-sm font-medium">
            Nombre amigable
          </label>
          <Input
            id="display_name"
            {...register("display_name")}
            placeholder="Ej: WhatsApp Local de Don Pepe"
          />
        </div>

      {/* ── Status ── */}
      <div className="space-y-2 pt-2">
        <label htmlFor="status" className="text-sm font-medium">
          Estado
        </label>
        <select
          id="status"
          {...register("status")}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
      </div>

      {/* ── Submit ── */}
      <div className="pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {mode === "create" ? "Conectando..." : "Guardando..."}
            </>
          ) : mode === "create" ? (
            "Conectar Evolution API"
          ) : (
            "Guardar Cambios"
          )}
        </Button>
      </div>
    </form>
  );
}
