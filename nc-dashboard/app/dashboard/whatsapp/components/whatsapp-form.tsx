"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  whatsappNumberFormSchema,
  type WhatsAppNumberFormValues,
} from "@/lib/schemas/whatsapp";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { Tenant } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface WhatsAppFormProps {
  defaultValues?: Partial<WhatsAppNumberFormValues>;
  onSubmit: (data: WhatsAppNumberFormValues) => Promise<void>;
  isSubmitting: boolean;
  mode: "create" | "edit";
  tenants: Tenant[];
  tenantsLoading: boolean;
}

/* ------------------------------------------------------------------ */
/*  Form                                                               */
/* ------------------------------------------------------------------ */

const STATUSES = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
  { value: "disconnected", label: "Desconectado" },
];

export function WhatsAppForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  mode,
  tenants,
  tenantsLoading,
}: WhatsAppFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WhatsAppNumberFormValues>({
    resolver: zodResolver(whatsappNumberFormSchema),
    defaultValues: {
      tenant_id: "",
      phone_number_id: "",
      waba_id: "",
      display_phone_number: "",
      verified_name: "",
      status: "active",
      is_primary: false,
      ...defaultValues,
    },
  });

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

      {/* ── Número ── */}
      <div className="space-y-2">
        <label htmlFor="display_phone_number" className="text-sm font-medium">
          Número de WhatsApp
        </label>
        <Input
          id="display_phone_number"
          {...register("display_phone_number")}
          placeholder="+573001234567"
        />
        {errors.display_phone_number && (
          <p className="text-xs text-destructive">
            {errors.display_phone_number.message}
          </p>
        )}
      </div>

      {/* ── Phone Number ID + WABA ID ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="phone_number_id" className="text-sm font-medium">
            Phone Number ID
          </label>
          <Input
            id="phone_number_id"
            {...register("phone_number_id")}
            placeholder="ID de Meta"
          />
          {errors.phone_number_id && (
            <p className="text-xs text-destructive">
              {errors.phone_number_id.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="waba_id" className="text-sm font-medium">
            WABA ID
          </label>
          <Input
            id="waba_id"
            {...register("waba_id")}
            placeholder="WhatsApp Business Account ID"
          />
          {errors.waba_id && (
            <p className="text-xs text-destructive">
              {errors.waba_id.message}
            </p>
          )}
        </div>
      </div>

      {/* ── Verified Name ── */}
      <div className="space-y-2">
        <label htmlFor="verified_name" className="text-sm font-medium">
          Nombre verificado
        </label>
        <Input
          id="verified_name"
          {...register("verified_name")}
          placeholder="Nombre registrado en Meta (opcional)"
        />
        {errors.verified_name && (
          <p className="text-xs text-destructive">
            {errors.verified_name.message}
          </p>
        )}
      </div>

      {/* ── Status + Primary ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="status" className="text-sm font-medium">
            Estado
          </label>
          <select
            id="status"
            {...register("status")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {errors.status && (
            <p className="text-xs text-destructive">{errors.status.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Principal</label>
          <label className="flex h-10 items-center gap-2 text-sm">
            <input
              type="checkbox"
              {...register("is_primary")}
              className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            Marcar como número principal
          </label>
        </div>
      </div>

      {/* ── Submit ── */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full sm:w-auto"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            {mode === "create" ? "Registrando..." : "Guardando..."}
          </>
        ) : mode === "create" ? (
          "Registrar Número"
        ) : (
          "Guardar Cambios"
        )}
      </Button>
    </form>
  );
}
