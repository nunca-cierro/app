"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { usePlatformConnection } from "@/hooks/use-platform-connections";
import { TelegramForm } from "@/components/telegram-form";
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
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Send,
  Hash,
  Calendar,
  Info,
  Globe,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import { toast } from "sonner";
import type { TelegramConnectionFormValues } from "@/lib/schemas/telegram";

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
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TelegramConnectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const {
    connection,
    isLoading,
    error,
    updateConnection,
    deleteConnection,
    registerWebhook,
  } = usePlatformConnection(id);

  const [activeTab, setActiveTab] = useState("info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRegisteringWebhook, setIsRegisteringWebhook] = useState(false);
  const [webhookResult, setWebhookResult] = useState<string | null>(null);

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
          <Link href="/dashboard/platforms/telegram">
            <ArrowLeft className="mr-2 size-4" />
            Volver a Telegram
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

  if (!connection) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/platforms/telegram">
            <ArrowLeft className="mr-2 size-4" />
            Volver a Telegram
          </Link>
        </Button>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              Conexión no encontrada.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const extraData = connection.extra_data as Record<string, string> | null;
  const defaultFormValues: TelegramConnectionFormValues = {
    tenant_id: connection.tenant_id ?? "",
    display_name: connection.display_name,
    bot_token: extraData?.bot_token ?? "",
    bot_username: extraData?.bot_username ?? "",
    status: connection.status as "active" | "inactive",
  };

  /* ── Handle update ── */
  const handleUpdate = async (data: TelegramConnectionFormValues) => {
    setIsSubmitting(true);
    try {
      await updateConnection({
        display_name: data.display_name,
        status: data.status,
        credentials: {
          bot_token: data.bot_token,
          bot_username: data.bot_username,
        },
        extra_data: {
          bot_token: data.bot_token,
          bot_username: data.bot_username,
        },
      });
      toast.success("Conexión actualizada exitosamente");
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

  /* ── Handle register webhook ── */
  const handleRegisterWebhook = async () => {
    setIsRegisteringWebhook(true);
    setWebhookResult(null);
    try {
      const result = await registerWebhook();
      setWebhookResult("ok");
      toast.success("Webhook registrado exitosamente");
    } catch (err) {
      setWebhookResult("error");
      const message =
        err instanceof ApiError ? err.message : "Error de conexión.";
      toast.error(message);
    } finally {
      setIsRegisteringWebhook(false);
    }
  };

  /* ── Handle delete ── */
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteConnection();
      toast.success("Conexión eliminada");
      router.replace("/dashboard/platforms/telegram");
    } catch {
      toast.error("Error al eliminar la conexión.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Navigation ── */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/platforms/telegram">
            <ArrowLeft className="mr-2 size-4" />
            Volver a Telegram
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
              <AlertDialogTitle>¿Eliminar conexión?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente
                la conexión {connection.display_name}.
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
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {connection.display_name}
                </h1>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                      connection.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {connection.status === "active" ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Información de la Conexión
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <InfoRow
                    icon={Send}
                    label="Plataforma"
                    value="Telegram"
                  />
                  <InfoRow
                    icon={Hash}
                    label="Usuario del Bot"
                    value={`@${extraData?.bot_username ?? "—"}`}
                  />
                  <InfoRow
                    icon={Info}
                    label="Token"
                    value={
                      extraData?.bot_token
                        ? `${extraData.bot_token.slice(0, 10)}...`
                        : "—"
                    }
                  />
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
                    value={new Date(connection.created_at).toLocaleDateString(
                      "es-CO",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            {/* ── Webhook ── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Webhook de Telegram
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Registrá el webhook para que Telegram envíe los mensajes de
                  tus clientes a NuncaCierro.
                </p>

                {extraData?.webhook_url && (
                  <InfoRow
                    icon={Globe}
                    label="URL del Webhook"
                    value={extraData.webhook_url}
                  />
                )}

                {extraData?.webhook_status === "registered" && (
                  <div className="flex items-center gap-2 text-xs text-green-600">
                    <CheckCircle2 className="size-4" />
                    Webhook registrado
                  </div>
                )}

                {webhookResult === "error" && (
                  <div className="flex items-center gap-2 text-xs text-destructive">
                    <XCircle className="size-4" />
                    Error al registrar el webhook
                  </div>
                )}

                <Button
                  onClick={handleRegisterWebhook}
                  disabled={isRegisteringWebhook}
                  size="sm"
                  variant={
                    extraData?.webhook_status === "registered"
                      ? "outline"
                      : "default"
                  }
                >
                  {isRegisteringWebhook ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Registrando...
                    </>
                  ) : extraData?.webhook_status === "registered" ? (
                    <>
                      <Globe className="mr-2 size-4" />
                      Re-registrar Webhook
                    </>
                  ) : (
                    <>
                      <Globe className="mr-2 size-4" />
                      Registrar Webhook
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="edit" className="mt-6">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold tracking-tight">
                Editar Conexión
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TelegramForm
                defaultValues={defaultFormValues}
                onSubmit={handleUpdate}
                isSubmitting={isSubmitting}
                mode="edit"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
