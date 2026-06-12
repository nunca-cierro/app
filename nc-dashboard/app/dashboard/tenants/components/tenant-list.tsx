"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TenantStatusBadge } from "@/app/dashboard/tenants/components/tenant-status-badge";
import { TenantPlanBadge } from "@/app/dashboard/tenants/components/tenant-plan-badge";
import { PaymentStatusBadge } from "@/app/dashboard/tenants/components/payment-status-badge";
import { Plus, ExternalLink } from "lucide-react";
import type { Tenant } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface TenantListProps {
  tenants: Tenant[];
  isLoading: boolean;
  error: string | null;
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                         */
/* ------------------------------------------------------------------ */

function EmptyState({ canCreate = true }: { canCreate?: boolean }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12">
        <p className="text-muted-foreground text-sm">
          No hay negocios registrados aún.
        </p>
        {canCreate && (
          <Button asChild variant="default" size="sm">
            <Link href="/dashboard/tenants/new">
              <Plus className="mr-2 size-4" />
              Crear Negocio
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Error state                                                         */
/* ------------------------------------------------------------------ */

function ErrorState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-8 text-center">
        <p className="text-sm text-destructive">{message}</p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                    */
/* ------------------------------------------------------------------ */

function Skeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="py-4">
            <div className="mb-2 h-5 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Table header                                                        */
/* ------------------------------------------------------------------ */

function TableHeader({ canCreate = true }: { canCreate?: boolean }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold">Negocios</h2>
      {canCreate && (
        <Button asChild size="sm">
          <Link href="/dashboard/tenants/new">
            <Plus className="mr-2 size-4" />
            Nuevo
          </Link>
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  List                                                               */
/* ------------------------------------------------------------------ */

export function TenantList({ tenants, isLoading, error }: TenantListProps) {
  const { user } = useAuth();
  const role = user?.current_role ?? user?.role;
  const canCreate = role === "superadmin";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <TableHeader canCreate={canCreate} />
        <Skeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <TableHeader canCreate={canCreate} />
        <ErrorState message={error} />
      </div>
    );
  }

  if (tenants.length === 0) {
    return <EmptyState canCreate={canCreate} />;
  }

  return (
    <div className="space-y-4">
      <TableHeader canCreate={canCreate} />

      <div className="space-y-2">
        {tenants.map((tenant) => (
          <Link key={tenant.id} href={`/dashboard/tenants/${tenant.id}`}>
            <Card className="transition-colors hover:bg-accent/50">
              <CardContent className="flex items-center justify-between py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {tenant.name}
                    </span>
                    <TenantStatusBadge status={tenant.status} />
                    <TenantPlanBadge plan={tenant.plan} createdAt={tenant.created_at} />
                    <PaymentStatusBadge status={tenant.payment_status} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {tenant.slug}
                  </p>
                </div>
                <ExternalLink className="ml-4 size-4 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
