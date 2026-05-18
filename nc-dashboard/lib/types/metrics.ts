/* ------------------------------------------------------------------ */
/*  DashboardMetrics — 1:1 con GET /api/v1/metrics/dashboard           */
/* ------------------------------------------------------------------ */

export interface DashboardMetrics {
  total_tenants: number;
  active_tenants: number;
  messages_today: number;
  messages_total: number;
  messages_in: number;
  messages_out: number;
}
