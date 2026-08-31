"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useTenants } from "@/hooks/use-tenants";
import { useMetrics } from "@/hooks/use-metrics";
import { useConversations } from "@/hooks/use-conversations";
import { useAgents } from "@/hooks/use-agents";
import { useAgent } from "@/hooks/use-agent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BusinessConfigForm } from "@/app/dashboard/agents/components/business-config-form";
import { ExpiredTrialOverlay } from "@/app/dashboard/components/expired-trial-overlay";
import { PaymentScreen } from "@/app/dashboard/components/payment-screen";
import { cn } from "@/lib/utils";
import { TRIAL_DAYS, daysRemaining } from "@/lib/trial";
import { buildAdminStats, type AdminStat } from "@/lib/dashboard-stats";
import {
  Building2,
  MessageSquare,
  Users,
  BarChart3,
  Loader2,
  AlertCircle,
  Clock,
  Shield,
  Sparkles,
  Pencil,
  ArrowRight,
  Bot,
  PlusCircle,
  CalendarDays,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { PLAN_LABELS } from "@/lib/plans";
import { INTERNAL_TENANT_SLUG } from "@/lib/config";
import { CAPABILITIES, hasCapability } from "@/lib/capabilities";
import { canSeeQuickActions } from "@/lib/rbac";
import type { UserRole } from "@/lib/types";
import type { BusinessConfig } from "@/lib/types/agent";

/* ------------------------------------------------------------------ */
/*  Brand-mapped stat icons                                            */
/* ------------------------------------------------------------------ */

const STAT_ICONS: Record<
  AdminStat["id"],
  { icon: React.ComponentType<{ className?: string }>; chip: string }
> = {
  tenants: {
    icon: Building2,
    chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  leads: {
    icon: Users,
    chip: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  "messages-today": {
    icon: MessageSquare,
    chip: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  "api-usage": {
    icon: BarChart3,
    chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
};

/* ------------------------------------------------------------------ */
/*  Shared presentational bits                                         */
/* ------------------------------------------------------------------ */

function WelcomeHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-background to-background p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <CalendarDays className="size-3.5" />
            {subtitle}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
            {title}
          </h1>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({ stat }: { stat: AdminStat }) {
  const meta = STAT_ICONS[stat.id];
  const Icon = meta.icon;
  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardContent className="flex items-start justify-between gap-3 pt-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">
            {stat.title}
          </p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight">{stat.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{stat.subtitle}</p>
        </div>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            meta.chip,
          )}
        >
          <Icon className="size-4" />
        </span>
      </CardContent>
    </Card>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      <AlertCircle className="size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function SectionHeader({
  title,
  linkHref,
  linkLabel,
}: {
  title: string;
  linkHref?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {linkHref && linkLabel ? (
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href={linkHref}>
            {linkLabel}
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Admin dashboard (full metrics)                                      */
/* ------------------------------------------------------------------ */

/**
 * Superadmin-only quick actions (owner decision #1: ALL THREE — Nuevo Agente,
 * Nuevo Negocio, Conversaciones — are gated, including the navigation link).
 *
 * "Por ahora" asymmetry (owner decision #3): admin keeps backend edit caps
 * (agents/connections are plan-gated for admin+superadmin) but temporarily
 * loses the create quick actions — see canSeeQuickActions() in lib/rbac.ts.
 */
export function AdminQuickActions({ role }: { role?: UserRole | string | null }) {
  if (!canSeeQuickActions(role)) return null;
  return (
    <>
      <Button asChild size="sm">
        <Link href="/dashboard/agents/new">
          <PlusCircle className="size-4" />
          Nuevo Agente
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href="/dashboard/tenants/new">Nuevo Negocio</Link>
      </Button>
      <Button asChild variant="ghost" size="sm">
        <Link href="/dashboard/conversations">
          Conversaciones
          <ArrowRight className="size-3.5" />
        </Link>
      </Button>
    </>
  );
}

function AdminDashboard({
  userName,
  role,
}: {
  userName?: string | null;
  role?: UserRole | string | null;
}) {
  const { metrics, isLoading, error } = useMetrics();
  const { tenants, isLoading: loadingTenants } = useTenants();
  const { conversations, isLoading: loadingConversations } = useConversations({ limit: 5 });

  if (error) return <ErrorBanner message={error} />;

  // Compute attention-needed tenants
  // eslint-disable-next-line react-hooks/purity
  const _now = Date.now();
  const _trialMs = TRIAL_DAYS * 86400000;
  const expiredTrials = (tenants ?? []).filter(
    (t) => t.plan === "trial" && new Date(t.created_at).getTime() + _trialMs < _now,
  );
  const pendingPayments = (tenants ?? []).filter(
    (t) => t.payment_status === "pending" && t.slug !== INTERNAL_TENANT_SLUG,
  );
  const needsAttention = expiredTrials.length + pendingPayments.length > 0;

  const stats = buildAdminStats(metrics, conversations.length);
  const todayLabel = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-8">
      {/* Welcome + quick actions (superadmin-only per RV-4) */}
      <WelcomeHeader
        title="Dashboard"
        subtitle={`${todayLabel} · Bienvenido, ${userName ?? "Usuario"}`}
        actions={<AdminQuickActions role={role} />}
      />

      {/* Requiere atención */}
      {needsAttention && (
        <section>
          <SectionHeader title="Requiere atención" />
          <div className="flex gap-3 overflow-x-auto pb-2">
            {expiredTrials.map((t) => (
              <Card key={t.id} className="shrink-0 border-warning/40">
                <CardContent className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2 font-medium text-warning-foreground">
                    <Clock className="size-3.5" />
                    Prueba vencida
                  </div>
                  <p className="mt-0.5 text-muted-foreground">{t.name}</p>
                </CardContent>
              </Card>
            ))}
            {pendingPayments.map((t) => (
              <Card key={t.id} className="shrink-0 border-warning/40">
                <CardContent className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2 font-medium text-warning-foreground">
                    <Wallet className="size-3.5" />
                    Pago pendiente
                  </div>
                  <p className="mt-0.5 text-muted-foreground">
                    {t.name} · Plan {PLAN_LABELS[t.plan] ?? t.plan}
                  </p>
                  <p className="mt-0.5 text-xs text-warning-foreground/80">
                    Esperando confirmación de pago
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            {[0, 1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="space-y-3 pt-5">
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-7 w-16 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : stats.length > 0 ? (
          stats.map((stat) => <StatCard key={stat.id} stat={stat} />)
        ) : null}
      </div>

      {/* Tenants */}
      <section>
        <SectionHeader
          title="Negocios Recientes"
          linkHref="/dashboard/tenants"
          linkLabel="Ver todos"
        />
        {loadingTenants ? (
          <Loader2 className="size-5 animate-spin" />
        ) : tenants.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay negocios.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tenants.slice(0, 6).map((t) => (
              <Card key={t.id} className="transition-shadow duration-200 hover:shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span
                      className={cn(
                        "inline-block size-1.5 rounded-full",
                        t.status === "active" ? "bg-success" : "bg-warning",
                      )}
                    />
                    {t.status === "active" ? "Activo" : "Inactivo"} ·{" "}
                    {PLAN_LABELS[t.plan] ?? t.plan}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Conversations */}
      <section>
        <SectionHeader
          title="Últimas Conversaciones"
          linkHref="/dashboard/conversations"
          linkLabel="Ver todas"
        />
        {loadingConversations ? (
          <Loader2 className="size-5 animate-spin" />
        ) : conversations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay conversaciones aún.
          </p>
        ) : (
          <div className="space-y-2">
            {conversations.map((c) => (
              <Card key={c.id} className="transition-shadow duration-200 hover:shadow-md">
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{c.wa_user_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.message_count} mensajes
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-block size-1.5 rounded-full",
                      c.status === "active" ? "bg-success" : "bg-muted-foreground/50",
                    )}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Client dashboard (plan-aware)                                       */
/* ------------------------------------------------------------------ */

function ClientDashboard() {
  const { user } = useAuth();
  const { tenants, isLoading: isLoadingTenants } = useTenants();
  const { agents } = useAgents();
  const plan = user?.plan ?? null;
  const tid = user?.current_tenant_id ?? user?.tenant_id;
  // Actions are driven by the backend capability matrix (plan controls
  // actions — never blocks dashboard entry). Legacy sessions without
  // `capabilities` fall back to the old role/plan behavior.
  const effectiveRole = user?.current_role ?? user?.role;
  // business_config mutation is operator-role-only server-side
  // (PATCH /agents = admin/superadmin), so this client view is read-only.
  const isOperator = effectiveRole === "admin" || effectiveRole === "superadmin";
  const canEdit = isOperator && hasCapability(user, CAPABILITIES.businessEdit);
  const canView = hasCapability(user, CAPABILITIES.businessView);

  const myTenant = tid ? tenants.find((t) => t.id === tid) : null;
  const myAgent = agents.find((a) => a.tenant_id === tid) ?? null;
  const remaining = myTenant?.created_at ? daysRemaining(myTenant.created_at) : 0;

  // Business config hooks (must be before early return for React hooks rules)
  const { updateBusinessConfig } = useAgent(myAgent?.id ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  // Payment status handling
  const paymentStatus = myTenant?.payment_status;
  if (!isLoadingTenants) {
    if (showPayment && plan) {
      return <PaymentScreen planKey={plan} onBack={() => setShowPayment(false)} />;
    }
    // Pending payment — show banner instead of blocking
    if (paymentStatus === "pending" && plan !== "trial") {
      // Show banner below, don't block dashboard access
    } else if (paymentStatus !== "active" && paymentStatus !== "pending") {
      // Overdue, suspended, trial expired, or null — block with overlay
      return <ExpiredTrialOverlay />;
    }
  }

  const handleSaveConfig = async (config: BusinessConfig) => {
    if (!myAgent?.id) return;
    setIsSaving(true);
    try {
      await updateBusinessConfig(config);
      toast.success("Información del negocio actualizada");
      setIsEditing(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Error al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  const todayLabel = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-6">
      {/* Welcome + quick actions */}
      <WelcomeHeader
        title={myTenant?.name ?? "Mi Negocio"}
        subtitle={`${todayLabel} · Bienvenido, ${user?.name ?? "Usuario"}`}
        actions={
          <Button asChild size="sm">
            <Link href="/dashboard/conversations">
              <MessageSquare className="size-4" />
              Ver Conversaciones
            </Link>
          </Button>
        }
      />

      {/* Pending payment banner — shown only when payment is pending and plan is not trial */}
      {paymentStatus === "pending" && plan !== "trial" && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <p className="font-medium text-warning-foreground">⏳ Pago pendiente</p>
          <p className="mt-1 text-muted-foreground">
            Tu pago está siendo verificado. Te activaremos el plan apenas se confirme.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 border-warning/50 text-warning-foreground hover:bg-warning/15"
            onClick={() => setShowPayment(true)}
          >
            Ver opciones de pago
          </Button>
        </div>
      )}

      {/* Plan card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Shield className="size-4 text-primary" />
            Plan Actual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant={plan === "trial" ? "outline" : "default"}>
              {plan === "professional" && <Sparkles className="size-3 mr-1" />}
              {PLAN_LABELS[plan ?? ""] ?? plan ?? "—"}
            </Badge>
            {plan === "trial" && (
              <span className="text-xs text-warning-foreground">
                {remaining > 0
                  ? `${remaining} días restantes de prueba`
                  : "Prueba finalizada"}
              </span>
            )}
          </div>

          {/* Plan features */}
          {plan === "trial" && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
              <p className="mb-1 font-medium">Plan de prueba — 7 días gratis</p>
              <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                <li>Respuestas automáticas por palabras clave</li>
                <li>Hasta 10 productos en catálogo</li>
                <li>1 negocio</li>
                <li>Sin acceso a IA ni métricas avanzadas</li>
              </ul>
            </div>
          )}

          {plan === "professional" && (
            <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-800 dark:text-sky-300">
              <p className="mb-1 font-medium">Plan Profesional — IA activa</p>
              <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                <li>Inteligencia artificial con Groq</li>
                <li>Hasta 50 productos en catálogo</li>
                <li>Hasta 3 negocios</li>
                <li>Dashboard en vivo con métricas</li>
              </ul>
            </div>
          )}

          {plan === "enterprise" && (
            <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-3 text-sm text-violet-800 dark:text-violet-300">
              <p className="mb-1 font-medium">Plan Empresarial — Acceso completo</p>
              <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                <li>Todo lo del plan Profesional</li>
                <li>Productos, conversaciones y negocios ilimitados</li>
                <li>Soporte prioritario 24/7</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Business info */}
      {myTenant && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="size-4 text-primary" />
              Información del Negocio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estado</span>
              <Badge variant={myTenant.status === "active" ? "default" : "secondary"}>
                {myTenant.status === "active" ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Creado</span>
              <span>{new Date(myTenant.created_at).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}</span>
            </div>
            {plan === "trial" && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  <Clock className="mr-1 inline size-3" />
                  Fin de la prueba
                </span>
                <span className="font-medium text-warning-foreground">
                  {remaining > 0 ? `${remaining} días` : "Finalizada"}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Business info — Professional sees read-only, Enterprise can edit */}
      {canView && myAgent && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              <Building2 className="mr-2 inline size-4 text-primary" />
              Información del Negocio
            </CardTitle>
            {canEdit && !isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil className="mr-1 size-3" /> Editar
              </Button>
            )}
          </CardHeader>
          {isEditing && canEdit ? (
            <CardContent>
              <BusinessConfigForm
                config={myAgent.business_config}
                onSave={handleSaveConfig}
                isSaving={isSaving}
                canAdd={canEdit}
              />
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setIsEditing(false)}
              >
                Cancelar
              </Button>
            </CardContent>
          ) : myAgent.business_config ? (
            <CardContent className="text-sm text-muted-foreground">
              {myAgent.business_config.business_info?.description && (
                <p>{myAgent.business_config.business_info.description}</p>
              )}
              {myAgent.business_config.products_services && myAgent.business_config.products_services.length > 0 && (
                <p className="mt-1">
                  {myAgent.business_config.products_services.length} productos/servicios · {myAgent.business_config.faq?.length ?? 0} preguntas frecuentes
                </p>
              )}
              {!myAgent.business_config.business_info?.description && (
                <p>Sin información configurada.</p>
              )}
              {!canEdit && (
                <p className="mt-2 text-xs text-muted-foreground/70">
                  Solo lectura. Contacta a tu administrador para realizar cambios.
                </p>
              )}
            </CardContent>
          ) : (
            <CardContent className="text-sm text-muted-foreground">
              Sin configuración.
            </CardContent>
          )}
        </Card>
      )}

      {/* Upgrade CTA for trial */}
      {plan === "trial" && (
        <div className="flex flex-col items-center gap-1 rounded-xl border border-warning/40 bg-warning/10 p-5 text-center">
          <Bot className="size-5 text-warning-foreground" />
          <p className="mt-1 text-sm font-medium text-warning-foreground">
            ¿Quieres activar un plan con inteligencia artificial?
          </p>
          <p className="text-xs text-muted-foreground">
            Contacta a tu administrador para cambiar a un plan Profesional o Empresarial.
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const role = user?.current_role ?? user?.role;

  // Client view — every authorized user sees the dashboard (plan controls
  // actions inside ClientDashboard, never entry).
  if (role === "client") {
    return (
      <div className="space-y-8">
        <ClientDashboard />
      </div>
    );
  }

  // Admin/superadmin view
  return (
    <div className="space-y-8">
      <AdminDashboard userName={user?.name ?? user?.email} role={role} />
    </div>
  );
}
