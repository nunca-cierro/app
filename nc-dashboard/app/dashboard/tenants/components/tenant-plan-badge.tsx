"use client";

import { Badge } from "@/components/ui/badge";

const TRIAL_DAYS = 7;

function daysRemaining(createdAt: string): number {
  const start = new Date(createdAt);
  const end = new Date(start.getTime() + TRIAL_DAYS * 86400000);
  const remaining = Math.ceil((end.getTime() - Date.now()) / 86400000);
  return Math.max(0, remaining);
}

const PLAN_STYLES: Record<string, string> = {
  trial: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
  basic: "border-stone-500/30 bg-stone-500/10 text-stone-300",
  professional: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  enterprise: "border-purple-500/30 bg-purple-500/10 text-purple-300",
};

const PLAN_LABELS: Record<string, string> = {
  trial: "Prueba",
  basic: "Básico",
  professional: "Profesional",
  enterprise: "Empresarial",
};

interface TenantPlanBadgeProps {
  plan: string;
  createdAt?: string;
}

export function TenantPlanBadge({ plan, createdAt }: TenantPlanBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={PLAN_STYLES[plan] ?? ""}>
        {PLAN_LABELS[plan] ?? plan}
      </Badge>
      {plan === "trial" && createdAt && (
        <span className="text-xs text-yellow-300/70">
          {daysRemaining(createdAt)} días restantes
        </span>
      )}
    </div>
  );
}
