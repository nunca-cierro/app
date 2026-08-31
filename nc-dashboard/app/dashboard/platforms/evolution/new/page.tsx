"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePlatformConnections } from "@/hooks/use-platform-connections";
import { useTenants } from "@/hooks/use-tenants";
import { useAuth } from "@/hooks/use-auth";
import { canManagePlatforms } from "@/lib/rbac";
import { AccessDeniedCard } from "@/components/access-denied";
import { EvolutionForm } from "@/app/dashboard/platforms/whatsapp/components/evolution-form";
import { QrDisplay } from "@/app/dashboard/platforms/evolution/components/qr-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { openSseStream } from "@/lib/sse";
import { toast } from "sonner";
import type { EvolutionFormValues } from "@/lib/schemas/evolution";

type Step = "form" | "connecting" | "qr" | "connected" | "error";

export default function PlatformsNewEvolutionPage() {
  const router = useRouter();
  const { createConnection } = usePlatformConnections();
  const { tenants, isLoading: loadingTenants } = useTenants();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Client is read-only on platforms (T2) — the create flow is unreachable.
  if (!canManagePlatforms(user?.current_role ?? user?.role)) {
    return <AccessDeniedCard />;
  }

  // SSE subscription for real-time connection state updates
  useEffect(() => {
    if (step !== "qr" || !connectionId) return;

    const token = localStorage.getItem("nc_access_token");
    if (!token) return;

    // Token travels in the Authorization header — never in the URL.
    const closeStream = openSseStream(
      `/api/v1/platform-connections/${connectionId}/events`,
      {
        token,
        onMessage: (msg) => {
          if (
            msg.type === "connection_state_changed" &&
            msg.data?.status === "connected"
          ) {
            setStep("connected");
            toast.success("WhatsApp conectado exitosamente");
            closeStream();
            // Redirect after a brief pause so user sees the success
            setTimeout(() => {
              router.push(`/dashboard/platforms/evolution/${connectionId}`);
            }, 1500);
          }
        },
        onError: () => {
          // Stream ended or failed — stop listening; the detail page
          // handles reconnection.
        },
      },
    );

    return () => {
      closeStream();
    };
  }, [step, connectionId, router]);

  const handleSubmit = async (data: EvolutionFormValues) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Create the connection — backend auto-fills evolution credentials
      const connection = await createConnection({
        tenant_id: data.tenant_id,
        platform_type: "evolution",
        display_name: data.display_name,
        status: data.status,
        credentials: {},  // backend auto-completa base_url, api_key, instance_name
        extra_data: data.agent_id
          ? { agent_id: data.agent_id }
          : undefined,
      });

      setConnectionId(connection.id);
      setStep("connecting");

      // 2. Auto-connect — creates instance in Evolution API, polls for QR
      const result = await apiClient<{
        qrcode?: string;
        instance_name: string;
        status: string;
      }>(`/api/v1/platform-connections/${connection.id}/connect-evolution`, {
        method: "POST",
      });

      if (result.qrcode) {
        setQrCode(result.qrcode);
        setStep("qr");
        toast.info("Escanea el código QR con WhatsApp para conectar");
      } else {
        // Already connected or connecting — go to detail
        router.push(`/dashboard/platforms/evolution/${connection.id}`);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error al conectar Evolution API";
      setErrorMsg(msg);
      setStep("error");
      toast.error(msg);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToDetail = useCallback(() => {
    if (connectionId) {
      router.push(`/dashboard/platforms/evolution/${connectionId}`);
    }
  }, [connectionId, router]);

  const goBack = useCallback(() => {
    setStep("form");
    setQrCode(null);
    setErrorMsg(null);
  }, []);

  /* ── QR view ── */
  if (step === "qr" && qrCode) {
    return (
      <div className="space-y-6">
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/platforms">
              <ArrowLeft className="mr-2 size-4" />
              Volver a Plataformas
            </Link>
          </Button>
        </div>

        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <CardTitle className="text-xl font-bold tracking-tight">
              Escanea el código QR
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Abre WhatsApp en tu teléfono y escanea este código para conectar.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 pb-8">
            <QrDisplay qrCode={qrCode} isPolling />
            <p className="text-xs text-muted-foreground text-center">
              El sistema detectará automáticamente cuando escanees el código
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Connected view ── */
  if (step === "connected") {
    return (
      <div className="space-y-6">
        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <CardTitle className="text-xl font-bold tracking-tight text-green-600">
              <CheckCircle2 className="inline-block size-8 mr-2" />
              WhatsApp Conectado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Redirigiendo al detalle de la conexión...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Error view ── */
  if (step === "error") {
    return (
      <div className="space-y-6">
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/platforms">
              <ArrowLeft className="mr-2 size-4" />
              Volver a Plataformas
            </Link>
          </Button>
        </div>

        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-xl font-bold tracking-tight text-destructive">
              Error al conectar
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {errorMsg || "Ocurrió un error inesperado."}
            </p>
            <div className="flex gap-2">
              <Button onClick={goBack} variant="outline">
                Intentar de nuevo
              </Button>
              {connectionId && (
                <Button onClick={goToDetail} variant="secondary">
                  Ver conexión
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Connecting view ── */
  if (step === "connecting") {
    return (
      <div className="space-y-6">
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/platforms">
              <ArrowLeft className="mr-2 size-4" />
              Volver a Plataformas
            </Link>
          </Button>
        </div>

        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <CardTitle className="text-xl font-bold tracking-tight">
              Creando conexión Evolution
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pb-8">
            <Loader2 className="size-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Creando instancia en Evolution API y esperando código QR...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Form view (default) ── */
  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/platforms">
            <ArrowLeft className="mr-2 size-4" />
            Volver a Plataformas
          </Link>
        </Button>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold tracking-tight">
            Conectar WhatsApp (Evolution API)
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Selecciona el negocio y crea la conexión. El código QR aparecerá
            automáticamente al conectarte.
          </p>
        </CardHeader>
        <CardContent>
          <EvolutionForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            mode="create"
            tenants={tenants}
            tenantsLoading={loadingTenants}
          />
        </CardContent>
      </Card>
    </div>
  );
}
