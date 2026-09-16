"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Plan configuration — source of truth for features and prices       */
/*                                                                     */
/*  Escenario A (owner-validated, plan-differentiation): prices are    */
/*  pure copy strings ("Desde $X.XXX/mes + IVA") — NEVER runtime         */
/*  arithmetic. Anti-undercut floor: nothing below $390.000, and paid    */
/*  tiers always carry "+ IVA".                                         */
/* ------------------------------------------------------------------ */

export const PLANS_CONFIG: Record<
  string,
  {
    label: string;
    priceLabel: string;
    features: string[];
  }
> = {
  basic: {
    label: "Básico",
    priceLabel: "Desde $390.000/mes + IVA",
    features: [
      "Hasta 2.000 respuestas con IA al mes",
      "Hasta 50 productos en catálogo",
      "1 número de WhatsApp",
    ],
  },
  professional: {
    label: "Profesional",
    priceLabel: "Desde $790.000/mes + IVA",
    features: [
      "Hasta 10.000 respuestas con IA al mes",
      "Hasta 200 productos en catálogo",
      "Hasta 5 números de WhatsApp",
      "Dashboard en vivo con métricas",
      "Soporte prioritario",
    ],
  },
  enterprise: {
    label: "Empresarial",
    priceLabel: "Desde $1.590.000/mes + IVA",
    features: [
      "Todo lo del plan Profesional",
      "Respuestas con IA ilimitadas",
      "Productos y números de WhatsApp ilimitados",
      "Soporte prioritario 24/7",
      "Onboarding personalizado",
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  PlanCard component                                                 */
/* ------------------------------------------------------------------ */

export interface PlanCardProps {
  plan: string;
  onSelect: (plan: string) => void;
  featured?: boolean;
}

export function PlanCard({ plan, onSelect, featured = false }: PlanCardProps) {
  const config = PLANS_CONFIG[plan];
  if (!config) return null;

  return (
    <Card
      className={`relative flex flex-col ${featured ? "border-primary ring-2 ring-primary/30" : ""}`}
    >
      {featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
          Recomendado
        </span>
      )}
      <CardHeader>
        <CardTitle className="text-lg">{config.label}</CardTitle>
        <div className="mt-1">
          <span className="text-3xl font-bold">{config.priceLabel}</span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <ul className="space-y-2 text-sm">
          {config.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-green-500" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-6">
            <Button
              className="w-full"
              variant={featured ? "default" : "outline"}
              onClick={() => onSelect(plan)}
            >
              Activar
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}