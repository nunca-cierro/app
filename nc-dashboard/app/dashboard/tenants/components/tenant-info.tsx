"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TenantStatusBadge } from "@/app/dashboard/tenants/components/tenant-status-badge";
import { TenantPlanBadge } from "@/app/dashboard/tenants/components/tenant-plan-badge";
import { PaymentStatusBadge } from "@/app/dashboard/tenants/components/payment-status-badge";
import { Calendar, Globe, Clock, FileText, ShieldCheck } from "lucide-react";
import type { Tenant } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface TenantInfoProps {
  tenant: Tenant;
}

/* ------------------------------------------------------------------ */
/*  Info row                                                            */
/* ------------------------------------------------------------------ */

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function TenantInfo({ tenant }: TenantInfoProps) {
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{tenant.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <TenantStatusBadge status={tenant.status} />
            <TenantPlanBadge plan={tenant.plan} createdAt={tenant.created_at} />
            <PaymentStatusBadge status={tenant.payment_status} />
          </div>
        </div>
      </div>

      {/* ── Details card ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Detalles</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <InfoRow icon={Globe} label="Slug" value={tenant.slug} />
          <InfoRow
            icon={Calendar}
            label="Creado"
            value={new Date(tenant.created_at).toLocaleDateString("es-CO", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
          <InfoRow icon={Clock} label="Zona horaria" value={tenant.timezone} />
          <InfoRow icon={Globe} label="Región" value={tenant.locale} />
          {tenant.plan_activated_at && (
            <InfoRow
              icon={ShieldCheck}
              label="Plan activado"
              value={new Date(tenant.plan_activated_at).toLocaleDateString("es-CO", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            />
          )}
        </CardContent>
      </Card>

      {/* ── Notes ── */}
      {tenant.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p className="text-sm whitespace-pre-wrap">{tenant.notes}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
