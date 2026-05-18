"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  tenantFormSchema,
  type TenantFormValues,
} from "@/lib/schemas/tenant";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface TenantFormProps {
  defaultValues?: Partial<TenantFormValues>;
  onSubmit: (data: TenantFormValues) => Promise<void>;
  isSubmitting: boolean;
  mode: "create" | "edit";
}

/* ------------------------------------------------------------------ */
/*  Form                                                               */
/* ------------------------------------------------------------------ */

const PLANS = [
  { value: "basic", label: "Basic" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise" },
];

const TIMEZONES = [
  "America/Bogota",
  "America/Mexico_City",
  "America/Argentina/Buenos_Aires",
  "America/Santiago",
  "America/Lima",
  "America/Caracas",
  "America/Panama",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/Madrid",
  "UTC",
];

const LOCALES = [
  { value: "es-CO", label: "Español (Colombia)" },
  { value: "es-MX", label: "Español (México)" },
  { value: "es-AR", label: "Español (Argentina)" },
  { value: "es-ES", label: "Español (España)" },
  { value: "en-US", label: "English (US)" },
  { value: "pt-BR", label: "Português (Brasil)" },
];

export function TenantForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  mode,
}: TenantFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TenantFormValues>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      name: "",
      plan: "basic",
      timezone: "America/Bogota",
      locale: "es-CO",
      notes: "",
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* ── Name ── */}
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Nombre del negocio
        </label>
        <Input
          id="name"
          {...register("name")}
          placeholder="Ej: Restaurante La 10"
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* ── Plan ── */}
      <div className="space-y-2">
        <label htmlFor="plan" className="text-sm font-medium">
          Plan
        </label>
        <select
          id="plan"
          {...register("plan")}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {PLANS.map((plan) => (
            <option key={plan.value} value={plan.value}>
              {plan.label}
            </option>
          ))}
        </select>
        {errors.plan && (
          <p className="text-xs text-destructive">{errors.plan.message}</p>
        )}
      </div>

      {/* ── Timezone + Locale ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="timezone" className="text-sm font-medium">
            Zona horaria
          </label>
          <select
            id="timezone"
            {...register("timezone")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          {errors.timezone && (
            <p className="text-xs text-destructive">
              {errors.timezone.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="locale" className="text-sm font-medium">
            Idioma / Región
          </label>
          <select
            id="locale"
            {...register("locale")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {LOCALES.map((locale) => (
              <option key={locale.value} value={locale.value}>
                {locale.label}
              </option>
            ))}
          </select>
          {errors.locale && (
            <p className="text-xs text-destructive">{errors.locale.message}</p>
          )}
        </div>
      </div>

      {/* ── Notes ── */}
      <div className="space-y-2">
        <label htmlFor="notes" className="text-sm font-medium">
          Notas
        </label>
        <textarea
          id="notes"
          {...register("notes")}
          rows={3}
          placeholder="Notas opcionales sobre el negocio..."
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {errors.notes && (
          <p className="text-xs text-destructive">{errors.notes.message}</p>
        )}
      </div>

      {/* ── Submit ── */}
      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            {mode === "create" ? "Creando..." : "Guardando..."}
          </>
        ) : mode === "create" ? (
          "Crear Negocio"
        ) : (
          "Guardar Cambios"
        )}
      </Button>
    </form>
  );
}
