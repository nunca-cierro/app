/**
 * Trial helpers — single source of truth for trial duration and
 * remaining-days calculation used across the dashboard.
 */

export const TRIAL_DAYS = 7;

const DAY_MS = 86400000;

/** Días restantes de la prueba (0 si ya venció). */
export function daysRemaining(createdAt: string): number {
  const start = new Date(createdAt);
  const end = new Date(start.getTime() + TRIAL_DAYS * DAY_MS);
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / DAY_MS));
}
