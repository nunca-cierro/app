"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TenantStatusBadge } from "@/app/dashboard/tenants/components/tenant-status-badge";
import { Phone, Hash, Building2, Star, Calendar } from "lucide-react";
import type { WhatsAppNumber } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface WhatsAppInfoProps {
  number: WhatsAppNumber;
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

export function WhatsAppInfo({ number }: WhatsAppInfoProps) {
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {number.display_phone_number}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <TenantStatusBadge status={number.status} />
            {number.is_primary && (
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                Principal
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Details ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Información del Número
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <InfoRow
              icon={Phone}
              label="Número"
              value={number.display_phone_number}
            />
            <InfoRow
              icon={Hash}
              label="Phone Number ID"
              value={number.phone_number_id}
            />
            <InfoRow icon={Building2} label="WABA ID" value={number.waba_id} />
            {number.verified_name && (
              <InfoRow
                icon={Star}
                label="Nombre verificado"
                value={number.verified_name}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <InfoRow
              icon={Calendar}
              label="Creado"
              value={new Date(number.created_at).toLocaleDateString("es-CO", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
