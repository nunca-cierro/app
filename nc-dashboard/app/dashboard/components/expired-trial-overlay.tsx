"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { PlanCard } from "@/app/dashboard/components/plan-card";
import { PaymentScreen } from "@/app/dashboard/components/payment-screen";

/* ------------------------------------------------------------------ */
/*  ExpiredTrialOverlay — shown when trial has ended                   */
/*  Manages two steps: "selecting" (plan cards) and "paying" (QR)      */
/* ------------------------------------------------------------------ */

export type OverlayStep = "selecting" | "paying";

export function ExpiredTrialOverlay() {
  const [step, setStep] = useState<OverlayStep>("selecting");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSelectPlan = (plan: string) => {
    setSelectedPlan(plan);
    setStep("paying");
  };

  const handleBack = () => {
    setStep("selecting");
    setSelectedPlan(null);
  };

  if (step === "paying" && selectedPlan) {
    return <PaymentScreen planKey={selectedPlan} onBack={handleBack} />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8">
      {/* Header */}
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="size-7 text-amber-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Tu prueba gratuita de 7 días finalizó
        </h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md">
          Elegí un plan para seguir usando NuncaCierro y no perder ninguna
          conversación ni configuración de tu negocio.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <PlanCard plan="basic" onSelect={handleSelectPlan} />
        <PlanCard plan="professional" onSelect={handleSelectPlan} featured />
        <PlanCard plan="enterprise" onSelect={handleSelectPlan} />
      </div>

      {/* Footer note */}
      <p className="text-muted-foreground text-center text-xs">
        Todos los planes incluyen configuración de respuestas automáticas y
        atención al cliente. Los precios están expresados en pesos colombianos
        (COP) e incluyen IVA.
      </p>
    </div>
  );
}
