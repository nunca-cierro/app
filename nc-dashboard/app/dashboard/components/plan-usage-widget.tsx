"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanUsage } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Pure state logic (testable without rendering)                      */
/* ------------------------------------------------------------------ */

export type UsageWidgetState =
  | "hidden" // API error → widget oculto (degradación graceful)
  | "loading" // fetch en curso sin datos previos
  | "idle" // sin tenant activo ni fetch pendiente
  | "unlimited" // pct null → enterprise/ilimitado, sin barra
  | "normal" // pct < 80 → barra sin CTA
  | "warning" // 80 <= pct <= 100 → barra + CTA a upgrade
  | "over"; // pct > 100 → exceso + CTA (informativo, nunca bloquea)

export function usageWidgetState(
  data: PlanUsage | null,
  isLoading: boolean,
  error: string | null,
): UsageWidgetState {
  if (error) return "hidden";
  if (isLoading && !data) return "loading";
  if (!data) return "idle";
  if (data.pct === null) return "unlimited";
  if (data.pct > 100) return "over";
  if (data.pct >= 80) return "warning";
  return "normal";
}

/** CTA a upgrade: solo cuando hay límite medible y uso >= 80%. */
export function shouldShowUpgradeCta(pct: number | null): boolean {
  return pct !== null && pct >= 80;
}

/** Ancho visual de la barra — clamp a 100% aunque pct exceda. */
export function usageBarWidth(pct: number): number {
  return Math.min(Math.max(pct, 0), 100);
}

/** Límite formateado es-CO; null (ilimitado) → "Ilimitado". */
export function formatUsageLimit(limit: number | null): string {
  return limit === null ? "Ilimitado" : limit.toLocaleString("es-CO");
}

/* ------------------------------------------------------------------ */
/*  Widget                                                             */
/* ------------------------------------------------------------------ */

/**
 * "Uso de su plan" — medidor informativo del tenant activo (Slice 3).
 * Barra vs límite mensual de respuestas IA; CTA a upgrade >= 80%;
 * estado de exceso > 100%; enterprise (pct null) sin barra; ante fallo
 * de API se oculta y el dashboard sigue operativo. NUNCA bloquea ni
 * sugiere enforcement (owner-validated: informative only).
 */
export function PlanUsageWidget({
  data,
  isLoading,
  error,
  onUpgrade,
}: {
  data: PlanUsage | null;
  isLoading: boolean;
  error: string | null;
  onUpgrade?: () => void;
}) {
  const state = usageWidgetState(data, isLoading, error);
  if (state === "hidden" || state === "idle") return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Shield className="size-4 text-primary" />
          Uso de su plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {state === "loading" ? (
          <div className="h-2.5 animate-pulse rounded-full bg-muted" />
        ) : state === "unlimited" ? (
          <p className="text-sm text-muted-foreground">
            Plan Ilimitado — sin límites de uso.
          </p>
        ) : data && data.pct !== null ? (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Respuestas IA este mes:{" "}
                <strong>
                  {data.usage.ai_responses.toLocaleString("es-CO")}
                </strong>{" "}
                de {formatUsageLimit(data.limits.max_conversations_per_month)}
              </span>
              <span
                className={cn(
                  "font-medium",
                  state === "over" && "text-destructive",
                )}
              >
                {data.pct}%
              </span>
            </div>

            <div
              role="progressbar"
              aria-label="Uso del plan"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={usageBarWidth(data.pct)}
            >
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-2.5 rounded-full transition-all",
                    state === "over"
                      ? "bg-destructive"
                      : state === "warning"
                        ? "bg-warning"
                        : "bg-primary",
                  )}
                  style={{ width: `${usageBarWidth(data.pct)}%` }}
                />
              </div>
            </div>

            {state === "over" && (
              <p className="text-xs text-destructive">
                Superó el límite mensual de respuestas IA.
              </p>
            )}

            {shouldShowUpgradeCta(data.pct) && (
              <Button
                size="sm"
                className="w-full"
                onClick={onUpgrade}
              >
                Mejorar plan
              </Button>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}