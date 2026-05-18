"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useWhatsAppNumber } from "@/hooks/use-whatsapp-number";
import { useTenants } from "@/hooks/use-tenants";
import { WhatsAppInfo } from "@/app/dashboard/whatsapp/components/whatsapp-info";
import { WhatsAppForm } from "@/app/dashboard/whatsapp/components/whatsapp-form";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react";
import { ApiError } from "@/lib/api";
import { toast } from "sonner";
import type { WhatsAppNumberFormValues } from "@/lib/schemas/whatsapp";

export default function PlatformsWhatsAppDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { number, isLoading, error, updateNumber, deleteNumber } =
    useWhatsAppNumber(id);
  const { tenants, isLoading: loadingTenants } = useTenants();

  const [activeTab, setActiveTab] = useState("info");
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
          <Link href="/dashboard/platforms/whatsapp">
            <ArrowLeft className="mr-2 size-4" />
            Volver a Números
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

  if (!number) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/platforms/whatsapp">
            <ArrowLeft className="mr-2 size-4" />
            Volver a Números
          </Link>
        </Button>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              Número no encontrado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Handle update ── */
  const handleUpdate = async (data: WhatsAppNumberFormValues) => {
    setIsSubmitting(true);
    try {
      await updateNumber(data);
      toast.success("Número actualizado exitosamente");
      setActiveTab("info");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
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
      await deleteNumber();
      toast.success("Número eliminado");
      router.replace("/dashboard/platforms/whatsapp");
    } catch {
      toast.error("Error al eliminar el número.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Navigation ── */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/platforms/whatsapp">
            <ArrowLeft className="mr-2 size-4" />
            Volver a Números
          </Link>
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 size-4" />
              Eliminar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar número?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente
                el número {number.display_phone_number}.
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

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="edit">
            <Pencil className="mr-2 size-4" />
            Editar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <WhatsAppInfo number={number} />
        </TabsContent>

        <TabsContent value="edit" className="mt-6">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold tracking-tight">
                Editar Número
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WhatsAppForm
                defaultValues={{
                  phone_number_id: number.phone_number_id,
                  waba_id: number.waba_id,
                  display_phone_number: number.display_phone_number,
                  verified_name: number.verified_name ?? "",
                  status: number.status as
                    | "active"
                    | "inactive"
                    | "disconnected",
                  is_primary: number.is_primary,
                }}
                onSubmit={handleUpdate}
                isSubmitting={isSubmitting}
                mode="edit"
                tenants={tenants}
                tenantsLoading={loadingTenants}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
