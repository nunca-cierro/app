"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTenants } from "@/hooks/use-tenants";
import { useMetrics } from "@/hooks/use-metrics";
import { useConversations } from "@/hooks/use-conversations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  MessageSquare,
  Users,
  BarChart3,
  Loader2,
  AlertCircle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Stat card definition                                                */
/* ------------------------------------------------------------------ */

interface StatCardDef {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

function StatCard({ title, value, subtitle, icon: Icon }: StatCardDef) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-muted-foreground mt-1 text-xs">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Error banner                                                        */
/* ------------------------------------------------------------------ */

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      <AlertCircle className="size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                    */
/* ------------------------------------------------------------------ */

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="size-4 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="mb-1 h-7 w-16 animate-pulse rounded bg-muted" />
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const { user } = useAuth();
  const { metrics, isLoading: loadingMetrics, error: metricsError } = useMetrics();
  const { tenants, isLoading: loadingTenants } = useTenants();
  const { conversations, isLoading: loadingConversations } = useConversations({
    limit: 5,
  });

  /* ── Stats ── */
  const statCards: StatCardDef[] = metrics
    ? [
        {
          title: "Negocios",
          value: metrics.total_tenants,
          subtitle: `${metrics.active_tenants} activos`,
          icon: Building2,
        },
        {
          title: "Leads",
          value: conversations.length,
          subtitle: "Conversaciones activas",
          icon: Users,
        },
        {
          title: "Mensajes Hoy",
          value: metrics.messages_today,
          subtitle: `${metrics.messages_total} totales`,
          icon: MessageSquare,
        },
        {
          title: "Uso API",
          value: metrics.messages_in + metrics.messages_out,
          subtitle: `${metrics.messages_in} recibidos · ${metrics.messages_out} enviados`,
          icon: BarChart3,
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* ── Welcome ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Bienvenido, {user?.name ?? user?.email ?? "Usuario"}
        </p>
      </div>

      {/* ── Error state ── */}
      {metricsError && <ErrorBanner message={metricsError} />}

      {/* ── Stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loadingMetrics ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          statCards.map((stat) => <StatCard key={stat.title} {...stat} />)
        )}
      </div>

      {/* ── Recent tenants ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Negocios Recientes</h2>

        {loadingTenants ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : tenants.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No hay negocios registrados aún.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tenants.slice(0, 6).map((tenant) => (
              <Card key={tenant.id} className="transition-colors hover:bg-accent/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {tenant.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span
                      className={`inline-block size-1.5 rounded-full ${
                        tenant.status === "active"
                          ? "bg-green-500"
                          : "bg-yellow-500"
                      }`}
                    />
                    {tenant.status === "active" ? "Activo" : "Inactivo"}
                    <span>·</span>
                    <span>{tenant.plan}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ── Recent conversations ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Últimas Conversaciones</h2>

        {loadingConversations ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No hay conversaciones aún.
          </p>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <Card key={conv.id} className="transition-colors hover:bg-accent/50">
                <CardContent className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {conv.wa_user_id}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {conv.summary ?? "Sin resumen"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    <span>{conv.message_count} msgs</span>
                    <span
                      className={`inline-block size-1.5 rounded-full ${
                        conv.status === "active"
                          ? "bg-green-500"
                          : "bg-gray-400"
                      }`}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
