"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TenantStatusBadge } from "@/app/dashboard/tenants/components/tenant-status-badge";
import { TenantPlanBadge } from "@/app/dashboard/tenants/components/tenant-plan-badge";
import { PaymentStatusBadge } from "@/app/dashboard/tenants/components/payment-status-badge";
import { PaymentStatusToggle } from "@/app/dashboard/tenants/components/payment-status-toggle";
import { TenantForm } from "@/app/dashboard/tenants/components/tenant-form";
import { Plus, Pencil, Trash2, Loader2, RefreshCw } from "lucide-react";
import type { Tenant } from "@/lib/types";
import type { TenantFormValues } from "@/lib/schemas/tenant";
import { useAuth } from "@/hooks/use-auth";
import { buildTenantPatchBody } from "@/hooks/use-tenant";
import { apiClient, ApiError } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface TenantListProps {
  tenants: Tenant[];
  isLoading: boolean;
  error: string | null;
  onTenantUpdate?: (updated?: Tenant) => void;
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
/*  Auto Renew Toggle                                                  */
/* ------------------------------------------------------------------ */

function AutoRenewToggle({
  tenant,
  onUpdate,
}: {
  tenant: Tenant;
  onUpdate: (updated: Tenant) => void;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const isAutoRenew = (tenant.notes || "").includes("[auto_renew:true]");

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUpdating) return;

    setIsUpdating(true);
    const newAutoRenew = !isAutoRenew;
    const cleanNotes = (tenant.notes || "").replace(/\[auto_renew:(true|false)\]\s*/g, "").trim();
    const newNotes = newAutoRenew
      ? `${cleanNotes ? cleanNotes + " " : ""}[auto_renew:true]`
      : cleanNotes;

    try {
      const updated = await apiClient<Tenant>(`/api/v1/tenants/${tenant.id}`, {
        method: "PATCH",
        body: JSON.stringify({ notes: newNotes }),
      });
      toast.success(
        newAutoRenew
          ? "Renovación automática activada"
          : "Renovación automática desactivada"
      );
      onUpdate(updated);
    } catch {
      toast.error("Error al actualizar renovación automática");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isUpdating}
      className={cn(
        "inline-flex items-center gap-1.5 h-7 rounded-md px-2 text-xs font-medium border transition-colors",
        isAutoRenew
          ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
          : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
      )}
      title={
        isAutoRenew
          ? "Renovación automática activa (haz clic para desactivar)"
          : "Activar renovación automática"
      }
    >
      <RefreshCw className={cn("size-3", isUpdating && "animate-spin")} />
      <span>{isAutoRenew ? "Auto-renovación" : "Sin auto-renovar"}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  List                                                               */
/* ------------------------------------------------------------------ */

export function TenantList({
  tenants,
  isLoading,
  error,
  onTenantUpdate,
}: TenantListProps) {
  const { user } = useAuth();
  const role = user?.current_role ?? user?.role;
  const isSuperadmin = role === "superadmin";
  const canCreate = isSuperadmin;
  const canEdit = isSuperadmin || role === "admin";
  const canDelete = isSuperadmin;

  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUpdate = async (data: TenantFormValues) => {
    if (!editingTenant) return;
    setIsSubmitting(true);
    try {
      const updated = await apiClient<Tenant>(`/api/v1/tenants/${editingTenant.id}`, {
        method: "PATCH",
        body: JSON.stringify(buildTenantPatchBody(data, role)),
      });
      toast.success("Negocio actualizado exitosamente");
      setEditingTenant(null);
      onTenantUpdate?.(updated);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          toast.error("El slug ya está en uso.");
        } else {
          toast.error("Error al actualizar el negocio.");
        }
      } else {
        toast.error("Error de conexión.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTenant) return;
    setIsDeleting(true);
    try {
      await apiClient(`/api/v1/tenants/${deletingTenant.id}`, {
        method: "DELETE",
      });
      toast.success("Negocio eliminado exitosamente");
      setDeletingTenant(null);
      onTenantUpdate?.();
    } catch {
      toast.error("Error al eliminar el negocio.");
    } finally {
      setIsDeleting(false);
    }
  };

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
          <Card key={tenant.id} className="transition-colors hover:bg-accent/30">
            <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3.5 px-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold">
                    {tenant.name}
                  </span>
                  <TenantStatusBadge status={tenant.status} />
                  <TenantPlanBadge
                    plan={tenant.plan}
                    createdAt={tenant.created_at}
                  />
                  <PaymentStatusBadge
                    status={tenant.payment_status}
                    expiresAt={tenant.plan_expires_at}
                  />
                  {onTenantUpdate && (
                    <>
                      <PaymentStatusToggle
                        tenantId={tenant.id}
                        currentStatus={tenant.payment_status ?? "inactive"}
                        onSuccess={onTenantUpdate}
                      />
                      <AutoRenewToggle
                        tenant={tenant}
                        onUpdate={onTenantUpdate}
                      />
                    </>
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {tenant.slug} • {tenant.timezone} • {tenant.locale}
                </p>
              </div>

              {/* Inline actions right on the same screen */}
              <div className="flex items-center gap-1.5 shrink-0">
                {canEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setEditingTenant(tenant)}
                  >
                    <Pencil className="mr-1.5 size-3.5" />
                    Editar
                  </Button>
                )}
                {canDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeletingTenant(tenant)}
                  >
                    <Trash2 className="size-3.5" />
                    <span className="sr-only sm:not-sr-only sm:ml-1.5">
                      Eliminar
                    </span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Tenant Dialog (in-page) */}
      <Dialog
        open={!!editingTenant}
        onOpenChange={(open) => !open && setEditingTenant(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Negocio</DialogTitle>
            <DialogDescription>
              Modifica la configuración de {editingTenant?.name}.
            </DialogDescription>
          </DialogHeader>
          {editingTenant && (
            <TenantForm
              defaultValues={{
                name: editingTenant.name,
                plan: editingTenant.plan as TenantFormValues["plan"],
                timezone: editingTenant.timezone,
                locale: editingTenant.locale,
                notes: editingTenant.notes ?? "",
              }}
              onSubmit={handleUpdate}
              isSubmitting={isSubmitting}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Tenant AlertDialog (in-page) */}
      <AlertDialog
        open={!!deletingTenant}
        onOpenChange={(open) => !open && setDeletingTenant(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar negocio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente{" "}
              {deletingTenant?.name} y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
