"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Plan configuration — source of truth for features and prices       */
/* ------------------------------------------------------------------ */

export const PLANS_CONFIG: Record<
  string,
  { label: string; price: number; features: string[] }
> = {
  basic: {
    label: "Básico",
    price: 60000,
    features: [
      "Respuestas automáticas por palabras clave",
      "Hasta 10 productos en catálogo",
      "1 negocio",
      "Sin acceso a IA ni métricas avanzadas",
    ],
  },
  professional: {
    label: "Profesional",
    price: 120000,
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
    price: 250000,
    features: [
      "Todo lo del plan Profesional",
      "Productos, conversaciones y negocios ilimitados",
      "Soporte prioritario 24/7",
      "Onboarding personalizado",
    ],
  },
};

export function formatPrice(price: number): string {
  return `$${price.toLocaleString("es-CO")}`;
}

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
          <span className="text-3xl font-bold">{formatPrice(config.price)}</span>
          <span className="text-muted-foreground ml-1 text-sm">/mes</span>
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
