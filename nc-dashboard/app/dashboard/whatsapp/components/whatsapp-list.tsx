"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TenantStatusBadge } from "@/app/dashboard/tenants/components/tenant-status-badge";
import { Plus, ExternalLink, Phone } from "lucide-react";
import type { WhatsAppNumber } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface WhatsAppListProps {
  numbers: WhatsAppNumber[];
  isLoading: boolean;
  error: string | null;
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                         */
/* ------------------------------------------------------------------ */

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12">
        <Phone className="size-10 text-muted-foreground/50" />
        <p className="text-muted-foreground text-sm">
          No hay números WhatsApp registrados.
        </p>
        <Button asChild variant="default" size="sm">
          <Link href="/dashboard/whatsapp/new">
            <Plus className="mr-2 size-4" />
            Registrar Número
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                            */
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
/*  List                                                               */
/* ------------------------------------------------------------------ */

export function WhatsAppList({ numbers, isLoading, error }: WhatsAppListProps) {
  if (isLoading) {
    return <Skeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (numbers.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-2">
      {numbers.map((num) => (
        <Link key={num.id} href={`/dashboard/whatsapp/${num.id}`}>
          <Card className="transition-colors hover:bg-accent/50">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full border p-2">
                  <Phone className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {num.display_phone_number}
                    </span>
                    <TenantStatusBadge status={num.status} />
                    {num.is_primary && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                        Principal
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {num.verified_name ?? "Sin nombre verificado"}
                    {" · "}
                    WABA: {num.waba_id.slice(0, 12)}...
                  </p>
                </div>
              </div>
              <ExternalLink className="ml-4 size-4 shrink-0 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
