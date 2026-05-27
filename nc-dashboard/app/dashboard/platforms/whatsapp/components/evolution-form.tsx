"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect, useCallback } from "react";
import { usePlatformConnections } from "@/hooks/use-platform-connections";
import {
  evolutionFormSchema,
  type EvolutionFormValues,
} from "@/lib/schemas/evolution";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Info, RefreshCw } from "lucide-react";
import { toast } from "sonner";
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
  const { fetchEvolutionInstances } = usePlatformConnections();
  const [instances, setInstances] = useState<any[]>([]);
  const [isFetchingInstances, setIsFetchingInstances] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EvolutionFormValues>({
    resolver: zodResolver(evolutionFormSchema),
    defaultValues: {
      tenant_id: "",
      display_name: "WhatsApp Evolution",
      base_url: "",
      api_key: "",
      instance_name: "",
      status: "active",
      is_primary: false,
      ...defaultValues,
    },
  });

  const baseUrl = watch("base_url");
  const apiKey = watch("api_key");

  const handleFetchInstances = useCallback(async () => {
    if (!baseUrl) {
      toast.error("Ingresa la URL del servidor primero");
      return;
    }
    setIsFetchingInstances(true);
    try {
      const data = await fetchEvolutionInstances(baseUrl, apiKey);
      console.log("Evolution instances response:", data);
      setInstances(data);
      if (data.length === 0) {
        toast.info("No se encontraron instancias en este servidor");
      }
    } catch (err) {
      console.error("Error fetching instances:", err);
      toast.error("No se pudieron obtener las instancias. Verifica la URL y API Key.");
    } finally {
      setIsFetchingInstances(false);
    }
  }, [fetchEvolutionInstances, baseUrl, apiKey]);

  useEffect(() => {
    if (mode === "edit" && defaultValues?.base_url) {
      handleFetchInstances();
    }
  }, [mode, defaultValues?.base_url, handleFetchInstances]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* ── 1. Evolution Server Info (Primer paso lógico) ── */}
      <div className="grid gap-6 p-4 rounded-lg border bg-muted/30">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label htmlFor="base_url" className="text-sm font-medium">
              URL de Evolution API
            </label>
            <Info className="size-3 text-muted-foreground" />
          </div>
          <Input
            id="base_url"
            {...register("base_url")}
            placeholder="https://tu-servidor-evolution.com"
          />
          {errors.base_url && (
            <p className="text-xs text-destructive">{errors.base_url.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="api_key" className="text-sm font-medium">
            Global API Key (Requerida para listar)
          </label>
          <Input
            id="api_key"
            type="password"
            {...register("api_key")}
            placeholder="Tu API Key de Evolution"
          />
        </div>

        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleFetchInstances}
            disabled={isFetchingInstances || !baseUrl}
          >
            {isFetchingInstances ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-4" />
            )}
            {instances.length > 0 ? "Actualizar Instancias" : "Cargar Instancias"}
          </Button>
        </div>
      </div>

      {/* ── 2. Instance Selection ── */}
      <div className="space-y-2">
        <label htmlFor="instance_name" className="text-sm font-medium">
          Seleccionar Instancia
        </label>
        {instances.length > 0 ? (
          <select
            id="instance_name"
            {...register("instance_name")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Selecciona una instancia...</option>
            {instances.map((item, idx) => {
              // Handle both nested {instance: {instanceName}} and direct {instanceName} formats
              const inst = item.instance || item;
              const name = inst.instanceName || inst.name || `Instancia ${idx}`;
              const status = inst.status || "unknown";
              return (
                <option key={name} value={name}>
                  {name} ({status})
                </option>
              );
            })}
          </select>
        ) : (
          <Input
            id="instance_name"
            {...register("instance_name")}
            placeholder="Carga las instancias primero o escribe el nombre"
          />
        )}
        {errors.instance_name && (
          <p className="text-xs text-destructive">{errors.instance_name.message}</p>
        )}
      </div>

      {/* ── 3. Internal Mapping (Negocio) ── */}
      <div className="space-y-4 pt-4 border-t">
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
          <label htmlFor="display_name" className="text-sm font-medium">
            Nombre amigable
          </label>
          <Input
            id="display_name"
            {...register("display_name")}
            placeholder="Ej: WhatsApp Local de Don Pepe"
          />
        </div>
      </div>

      {/* ── Status + Primary ── */}
      <div className="grid gap-4 sm:grid-cols-2 pt-2">
        <div className="space-y-2">
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

        <div className="space-y-2">
          <label className="text-sm font-medium">Principal</label>
          <label className="flex h-10 items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              {...register("is_primary")}
              className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            Conexión principal
          </label>
        </div>
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
