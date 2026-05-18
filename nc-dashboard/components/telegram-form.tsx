"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  telegramConnectionSchema,
  type TelegramConnectionFormValues,
} from "@/lib/schemas/telegram";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import type { Tenant } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface TelegramFormProps {
  defaultValues?: Partial<TelegramConnectionFormValues>;
  onSubmit: (data: TelegramConnectionFormValues) => Promise<void>;
  isSubmitting: boolean;
  mode: "create" | "edit";
  tenants?: Tenant[];
  tenantsLoading?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Status options                                                      */
/* ------------------------------------------------------------------ */

const STATUSES = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
];

/* ------------------------------------------------------------------ */
/*  Form                                                               */
/* ------------------------------------------------------------------ */

export function TelegramForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  mode,
  tenants,
  tenantsLoading,
}: TelegramFormProps) {
  const [tokenStatus, setTokenStatus] = useState<
    "idle" | "validating" | "valid" | "invalid"
  >("idle");

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<TelegramConnectionFormValues>({
    resolver: zodResolver(telegramConnectionSchema),
    defaultValues: {
      tenant_id: "",
      display_name: "",
      bot_token: "",
      bot_username: "",
      status: "active",
      ...defaultValues,
    },
  });

  const botToken = useWatch({ control, name: "bot_token" });

  /* ── Token validation ── */
  const handleValidateToken = () => {
    if (!botToken || botToken.length < 5) {
      setTokenStatus("invalid");
      return;
    }

    setTokenStatus("validating");

    // Call Telegram's getMe via backend proxy to validate the token
    apiClient("/api/v1/platform-connections/validate-telegram-token", {
      method: "POST",
      body: JSON.stringify({ bot_token: botToken }),
    })
      .then(() => {
        setTokenStatus("valid");
      })
      .catch(() => {
        setTokenStatus("invalid");
      });
  };

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
              {tenants?.map((t) => (
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

      {/* ── Display Name ── */}
      <div className="space-y-2">
        <label htmlFor="display_name" className="text-sm font-medium">
          Nombre
        </label>
        <Input
          id="display_name"
          {...register("display_name")}
          placeholder="Ej: Bot de Soporte Técnico"
        />
        {errors.display_name && (
          <p className="text-xs text-destructive">
            {errors.display_name.message}
          </p>
        )}
      </div>

      {/* ── Bot Token + Validate Button ── */}
      <div className="space-y-2">
        <label htmlFor="bot_token" className="text-sm font-medium">
          Token del Bot
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="bot_token"
              type="password"
              {...register("bot_token")}
              placeholder="1234567890:ABCdefGHIjklmNOPqrSTUvWXyz"
              onChange={(e) => {
                register("bot_token").onChange(e);
                setTokenStatus("idle");
              }}
            />
            {tokenStatus === "valid" && (
              <CheckCircle className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-green-500" />
            )}
            {tokenStatus === "invalid" && (
              <XCircle className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-destructive" />
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleValidateToken}
            disabled={tokenStatus === "validating" || !botToken}
            className="shrink-0"
          >
            {tokenStatus === "validating" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : tokenStatus === "valid" ? (
              "Válido"
            ) : (
              "Validar"
            )}
          </Button>
        </div>
        {tokenStatus === "invalid" && (
          <p className="text-xs text-destructive">
            Token inválido. Verifica que el token sea correcto.
          </p>
        )}
        {errors.bot_token && (
          <p className="text-xs text-destructive">
            {errors.bot_token.message}
          </p>
        )}
      </div>

      {/* ── Bot Username ── */}
      <div className="space-y-2">
        <label htmlFor="bot_username" className="text-sm font-medium">
          Usuario del Bot
        </label>
        <Input
          id="bot_username"
          {...register("bot_username")}
          placeholder="@MySupportBot o MySupportBot"
        />
        {errors.bot_username && (
          <p className="text-xs text-destructive">
            {errors.bot_username.message}
          </p>
        )}
      </div>

      {/* ── Status ── */}
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
          "Registrar Conexión"
        ) : (
          "Guardar Cambios"
        )}
      </Button>
    </form>
  );
}
