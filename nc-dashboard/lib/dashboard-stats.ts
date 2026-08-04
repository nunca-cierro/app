/**
 * Admin dashboard stat cards — pure mapping from metrics to display data.
 * Kept free of React so it can be unit-tested in isolation.
 */

import type { DashboardMetrics } from "@/lib/types";

export interface AdminStat {
  id: string;
  title: string;
  value: string;
  subtitle: string;
}

/**
 * Builds the four admin stat cards. Returns an empty list while metrics
 * are still loading (null).
 */
export function buildAdminStats(
  metrics: DashboardMetrics | null,
  conversationsCount: number,
): AdminStat[] {
  if (!metrics) return [];

  return [
    {
      id: "tenants",
      title: "Negocios",
      value: String(metrics.total_tenants),
      subtitle: `${metrics.active_tenants} activos`,
    },
    {
      id: "leads",
      title: "Leads",
      value: String(conversationsCount),
      subtitle: "Conversaciones activas",
    },
    {
      id: "messages-today",
      title: "Mensajes Hoy",
      value: String(metrics.messages_today),
      subtitle: `${metrics.messages_total} totales`,
    },
    {
      id: "api-usage",
      title: "Uso API",
      value: String(metrics.messages_in + metrics.messages_out),
      subtitle: `${metrics.messages_in} recibidos · ${metrics.messages_out} enviados`,
    },
  ];
}
