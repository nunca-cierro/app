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
 * strings — never runtime arithmetic. The anti-undercut floor is $390K: no
 * SaaS pricing surface may show less, and paid tiers always carry "+ IVA".
 * Corporate is intentionally absent: it is a marketing-only plan ("A cotizar")
 * and MUST NOT be payable/activatable in the payment flow.
 */
export const PRICE_LABELS: Record<string, string> = {
  basic: "Desde $390K/mes + IVA",
  professional: "Desde $790K/mes + IVA",
  enterprise: "Desde $1.590K/mes + IVA",
};
