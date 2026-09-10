/**
 * Shared plan constants — single source of truth for plan labels.
 *
 * Import from this module instead of defining inline constants.
 */

export const PLAN_LABELS: Record<string, string> = {
  trial: "Prueba",
  basic: "Básico",
  professional: "Profesional",
  enterprise: "Empresarial",
};

/**
 * Escenario A (owner-validated, plan-differentiation): prices are pure copy
 * strings — never runtime arithmetic. Canon format is "$X.XXX/mes + IVA"
 * (dot-separated thousands, no "K" suffix) — matches agents/templates.py and
 * the web format "$699.900". The anti-undercut floor is $390.000: no SaaS
 * pricing surface may show less, and paid tiers always carry "+ IVA".
 * Corporate is intentionally absent: it is a marketing-only plan ("A cotizar")
 * and MUST NOT be payable/activatable in the payment flow.
 */
export const PRICE_LABELS: Record<string, string> = {
  basic: "Desde $390.000/mes + IVA",
  professional: "Desde $790.000/mes + IVA",
  enterprise: "Desde $1.590.000/mes + IVA",
};
