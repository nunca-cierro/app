/* ------------------------------------------------------------------ */
/*  Plan usage types — 1:1 con PlanUsageResponse del backend           */
/*  (GET /api/v1/plans/usage, plan-differentiation Phase 2).           */
/*  `pct` es null cuando el plan es ilimitado (enterprise); los        */
/*  límites null significan "sin límite". Solo lectura informativa.    */
/* ------------------------------------------------------------------ */

export interface PlanLimits {
  max_agents: number | null;
  max_products: number | null;
  max_conversations_per_month: number | null;
  max_businesses: number | null;
}

export interface PlanUsageCounters {
  ai_responses: number;
  products: number;
  businesses: number;
}

export interface PlanUsage {
  plan: string;
  limits: PlanLimits;
  usage: PlanUsageCounters;
  /** % de respuestas IA vs límite mensual (métrica primaria, D1). */
  pct: number | null;
  /** true si CUALQUIER métrica excede su límite (soft, no bloquea). */
  over_limit: boolean;
}