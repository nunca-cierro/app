"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { siteContactInfo } from "@/data/site";

/* ------------------------------------------------------------------ */
/*  Plan configuration — source of truth for features and prices       */
/*                                                                     */
/*  Escenario A (owner-validated, plan-differentiation): prices are    */
/*  pure copy strings ("Desde $X/mes + IVA") — NEVER runtime            */
/*  arithmetic. Anti-undercut floor: nothing below $390K, and paid      */
/*  tiers always carry "+ IVA". Corporate is marketing-only:            */
/*  "A cotizar" with a quote CTA, no "Activar" (not payable).           */
/* ------------------------------------------------------------------ */

const CORPORATE_QUOTE_URL = `https://wa.me/${siteContactInfo.whatsappNumber}?text=${encodeURIComponent(
  "Hola, quiero cotizar el plan Corporativo para mi negocio.",
)}`;

export const PLANS_CONFIG: Record<
  string,
  {
    label: string;
    priceLabel: string;
    features: string[];
    quoteOnly?: boolean;
    quoteUrl?: string;
  }
> = {
  basic: {
    label: "Básico",
    priceLabel: "Desde $390K/mes + IVA",
    features: [
      "Respuestas automáticas por palabras clave",
      "Hasta 10 productos en catálogo",
      "1 negocio",
      "Sin acceso a IA ni métricas avanzadas",
    ],
  },
  professional: {
    label: "Profesional",
    priceLabel: "Desde $790K/mes + IVA",
    features: [
      "Inteligencia artificial con Groq",
      "Hasta 50 productos en catálogo",
      "Hasta 3 negocios",
      "Dashboard en vivo con métricas",
      "Soporte prioritario",
    ],
  },
  enterprise: {
    label: "Empresarial",
    priceLabel: "Desde $1.590K/mes + IVA",
    features: [
      "Todo lo del plan Profesional",
      "Productos, conversaciones y negocios ilimitados",
      "Soporte prioritario 24/7",
      "Onboarding personalizado",
    ],
  },
  corporate: {
    label: "Corporativo",
    priceLabel: "A cotizar",
    quoteOnly: true,
    quoteUrl: CORPORATE_QUOTE_URL,
    features: [
      "Proyectos desde ~$3.5M/mes + IVA",
      "Múltiples negocios y usuarios",
      "IA personalizada para tu operación",
      "Soporte dedicado y onboarding",
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
          {config.quoteOnly ? (
            <Button asChild className="w-full" variant="outline">
              <a href={config.quoteUrl} target="_blank" rel="noopener noreferrer">
                Cotizar
              </a>
            </Button>
          ) : (
            <Button
              className="w-full"
              variant={featured ? "default" : "outline"}
              onClick={() => onSelect(plan)}
            >
              Activar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}