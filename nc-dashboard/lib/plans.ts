/**
 * Shared plan constants — single source of truth for plan labels, prices, and features.
 *
 * Import from this module instead of defining inline constants.
 */

export const PLAN_LABELS: Record<string, string> = {
  trial: "Prueba",
  basic: "Básico",
  professional: "Profesional",
  enterprise: "Empresarial",
};

export const PLAN_PRICES: Record<string, number> = {
  basic: 60000,
  professional: 120000,
  enterprise: 250000,
};

export const PLAN_FEATURES: Record<string, string[]> = {
  trial: ["7 días gratis", "Respuestas programadas", "Dashboard propio"],
  basic: [
    "Respuestas programadas",
    "Hasta 10 productos",
    "500 conversaciones/mes",
    "1 negocio",
  ],
  professional: [
    "IA con Groq",
    "Hasta 50 productos",
    "5.000 conversaciones/mes",
    "Hasta 3 negocios",
    "Dashboard en vivo",
  ],
  enterprise: [
    "IA ilimitada",
    "Productos ilimitados",
    "Conversaciones ilimitadas",
    "Negocios ilimitados",
    "Soporte prioritario 24/7",
  ],
};
