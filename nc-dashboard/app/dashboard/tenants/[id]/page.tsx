"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTenant } from "@/hooks/use-tenant";
import { TenantInfo } from "@/app/dashboard/tenants/components/tenant-info";
import { TenantForm } from "@/app/dashboard/tenants/components/tenant-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react";
import { ApiError } from "@/lib/api";
import { toast } from "sonner";
import type { TenantFormValues } from "@/lib/schemas/tenant";

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { tenant, isLoading, error, updateTenant, deleteTenant } =
    useTenant(id);

  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/tenants">
            <ArrowLeft className="mr-2 size-4" />
            Volver a Negocios
          </Link>
        </Button>
        <Card>
          <CardContent className="flex items-center gap-3 py-8">
            <AlertCircle className="size-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Not found ── */
  if (!tenant) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/tenants">
            <ArrowLeft className="mr-2 size-4" />
            Volver a Negocios
          </Link>
        </Button>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              Negocio no encontrado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Handle update ── */
  const handleUpdate = async (data: TenantFormValues) => {
    setIsSubmitting(true);
    try {
      await updateTenant(data);
      toast.success("Negocio actualizado exitosamente");
      setIsEditing(false);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          toast.error("El slug ya está en uso.");
        } else {
          toast.error("Error al actualizar. Intenta de nuevo.");
        }
      } else {
        toast.error("Error de conexión.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Handle delete ── */
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTenant();
      toast.success("Negocio eliminado");
      router.replace("/dashboard/tenants");
    } catch {
      toast.error("Error al eliminar el negocio.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Navigation ── */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/tenants">
            <ArrowLeft className="mr-2 size-4" />
            Volver a Negocios
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="mr-2 size-4" />
              Editar
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 size-4" />
                Eliminar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar negocio?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Se eliminará permanentemente{" "}
                  {tenant.name} y todos sus datos asociados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
      </div>

      {/* ── Content ── */}
      {isEditing ? (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold tracking-tight">
              Editar Negocio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TenantForm
              defaultValues={{
                name: tenant.name,
                plan: tenant.plan as "basic" | "pro" | "enterprise",
                timezone: tenant.timezone,
                locale: tenant.locale,
                notes: tenant.notes ?? "",
              }}
              onSubmit={handleUpdate}
              isSubmitting={isSubmitting}
              mode="edit"
            />
          </CardContent>
        </Card>
      ) : (
        <TenantInfo tenant={tenant} />
      )}
    </div>
  );
}
