"use client";

import { useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { PLAN_LABELS } from "@/lib/plans";
import type { BusinessConfig } from "@/lib/types/agent";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const TRIAL_DAYS = 7;

function daysRemaining(createdAt: string): number {
  const start = new Date(createdAt);
  const end = new Date(start.getTime() + TRIAL_DAYS * 86400000);
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
}

/* ------------------------------------------------------------------ */
/*  Stat card                                                        */
/* ------------------------------------------------------------------ */

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
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
/*  Admin dashboard (full metrics)                                      */
/* ------------------------------------------------------------------ */

function AdminDashboard() {
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
    (t) => t.payment_status === "pending",
  );
  const needsAttention = expiredTrials.length + pendingPayments.length > 0;

  return (
    <div className="space-y-8">
      {/* Requiere atención */}
      {needsAttention && (
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="size-4 text-amber-500" />
            Requiere atención
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {expiredTrials.map((t) => (
              <Card key={t.id} className="shrink-0 border-yellow-300/50">
                <CardContent className="py-3 px-4 text-sm">
                  <div className="flex items-center gap-2 font-medium text-yellow-800">
                    <Clock className="size-3.5" />
                    Prueba vencida
                  </div>
                  <p className="text-yellow-700 mt-0.5">{t.name}</p>
                </CardContent>
              </Card>
            ))}
            {pendingPayments.map((t) => (
              <Card key={t.id} className="shrink-0 border-amber-300/50">
                <CardContent className="py-3 px-4 text-sm">
                  <div className="flex items-center gap-2 font-medium text-amber-800">
                    <Clock className="size-3.5" />
                    Pago pendiente
                  </div>
                  <p className="text-amber-700 mt-0.5">{t.name} · {PLAN_LABELS[t.plan] ?? t.plan}</p>
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
            <Card><CardContent className="py-8"><div className="h-6 w-20 animate-pulse rounded bg-muted mx-auto" /></CardContent></Card>
            <Card><CardContent className="py-8"><div className="h-6 w-20 animate-pulse rounded bg-muted mx-auto" /></CardContent></Card>
            <Card><CardContent className="py-8"><div className="h-6 w-20 animate-pulse rounded bg-muted mx-auto" /></CardContent></Card>
            <Card><CardContent className="py-8"><div className="h-6 w-20 animate-pulse rounded bg-muted mx-auto" /></CardContent></Card>
          </>
        ) : metrics ? (
          <>
            <StatCard title="Negocios" value={metrics.total_tenants} subtitle={`${metrics.active_tenants} activos`} icon={Building2} />
            <StatCard title="Leads" value={conversations.length} subtitle="Conversaciones activas" icon={Users} />
            <StatCard title="Mensajes Hoy" value={metrics.messages_today} subtitle={`${metrics.messages_total} totales`} icon={MessageSquare} />
            <StatCard title="Uso API" value={metrics.messages_in + metrics.messages_out} subtitle={`${metrics.messages_in} recibidos · ${metrics.messages_out} enviados`} icon={BarChart3} />
          </>
        ) : null}
      </div>

      {/* Tenants */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Negocios Recientes</h2>
        {loadingTenants ? (
          <Loader2 className="size-5 animate-spin" />
        ) : tenants.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay negocios.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tenants.slice(0, 6).map((t) => (
              <Card key={t.id}>
                <CardHeader className="pb-2"><CardTitle className="text-sm">{t.name}</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={`inline-block size-1.5 rounded-full ${t.status === "active" ? "bg-green-500" : "bg-yellow-500"}`} />
                    {t.status === "active" ? "Activo" : "Inactivo"} · {PLAN_LABELS[t.plan] ?? t.plan}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Conversations */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Últimas Conversaciones</h2>
        {loadingConversations ? (
          <Loader2 className="size-5 animate-spin" />
        ) : conversations.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay conversaciones aún.</p>
        ) : (
          <div className="space-y-2">
            {conversations.map((c) => (
              <Card key={c.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{c.wa_user_id}</p>
                    <p className="text-xs text-muted-foreground">{c.message_count} mensajes</p>
                  </div>
                  <span className={`inline-block size-1.5 rounded-full ${c.status === "active" ? "bg-green-500" : "bg-gray-400"}`} />
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
  const canEdit = plan === "enterprise";
  const canView = plan === "professional" || plan === "enterprise";

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

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {myTenant?.name ?? "Mi Negocio"}
        </h1>
        <p className="text-muted-foreground mt-1">
          Bienvenido, {user?.name ?? "Usuario"}
        </p>
      </div>

      {/* Pending payment banner — shown only when payment is pending and plan is not trial */}
      {paymentStatus === "pending" && plan !== "trial" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">⏳ Pago pendiente</p>
          <p className="mt-1 text-amber-700">
            Tu pago está siendo verificado. Te activaremos el plan apenas se confirme.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 border-amber-300 text-amber-800 hover:bg-amber-100"
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
            <Shield className="size-4" />
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
              <span className="text-xs text-yellow-600">
                {remaining > 0
                  ? `${remaining} días restantes de prueba`
                  : "Prueba finalizada"}
              </span>
            )}
          </div>

          {/* Plan features */}
          {plan === "trial" && (
            <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
              <p className="font-medium mb-1">Plan de prueba — 7 días gratis</p>
              <ul className="space-y-1 text-yellow-700 list-disc list-inside text-xs">
                <li>Respuestas automáticas por palabras clave</li>
                <li>Hasta 10 productos en catálogo</li>
                <li>1 negocio</li>
                <li>Sin acceso a IA ni métricas avanzadas</li>
              </ul>
            </div>
          )}

          {plan === "professional" && (
            <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
              <p className="font-medium mb-1">Plan Profesional — IA activa</p>
              <ul className="space-y-1 text-blue-700 list-disc list-inside text-xs">
                <li>Inteligencia artificial con Groq</li>
                <li>Hasta 50 productos en catálogo</li>
                <li>Hasta 3 negocios</li>
                <li>Dashboard en vivo con métricas</li>
              </ul>
            </div>
          )}

          {plan === "enterprise" && (
            <div className="rounded-md bg-purple-50 border border-purple-200 p-3 text-sm text-purple-800">
              <p className="font-medium mb-1">Plan Empresarial — Acceso completo</p>
              <ul className="space-y-1 text-purple-700 list-disc list-inside text-xs">
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
              <Building2 className="size-4" />
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
                  <Clock className="inline size-3 mr-1" />
                  Fin de la prueba
                </span>
                <span className="text-yellow-600 font-medium">
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
              <Building2 className="inline size-4 mr-2" />
              Información del Negocio
            </CardTitle>
            {canEdit && !isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil className="size-3 mr-1" /> Editar
              </Button>
            )}
          </CardHeader>
          {isEditing && canEdit ? (
            <CardContent>
              <BusinessConfigForm
                config={myAgent.business_config}
                onSave={handleSaveConfig}
                isSaving={isSaving}
                canAdd={plan === "enterprise"}
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
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
          <p className="text-sm font-medium text-amber-800">
            ¿Querés activar un plan con inteligencia artificial?
          </p>
          <p className="text-xs text-amber-600 mt-1">
            Contactá a tu administrador para cambiar a un plan Profesional o Empresarial.
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
  const plan = user?.plan;

  // Basic plan: no access
  if (role === "client" && plan === "basic") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="size-12 text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold">Sin acceso</h1>
        <p className="text-muted-foreground mt-2 max-w-sm">
          Tu plan actual (Básico) no incluye acceso al dashboard. Contactá a tu
          administrador para cambiar a un plan con acceso.
        </p>
      </div>
    );
  }

  // Client view
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Bienvenido, {user?.name ?? user?.email ?? "Usuario"}
        </p>
      </div>
      <AdminDashboard />
    </div>
  );
}
