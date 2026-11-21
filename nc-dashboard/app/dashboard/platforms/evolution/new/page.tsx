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
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw, AlertCircle } from "lucide-react";
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
  const QR_LIFESPAN = 50; // WhatsApp Web QR lifespan in seconds
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(QR_LIFESPAN);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);

  // Transition to connected and redirect
  const handleConnected = useCallback(() => {
    setStep("connected");
    toast.success("WhatsApp conectado exitosamente");
    setTimeout(() => {
      if (connectionId) {
        router.push(`/dashboard/platforms/evolution/${connectionId}`);
      }
    }, 1500);
  }, [connectionId, router]);

  // Countdown timer for QR expiration
  useEffect(() => {
    if (step !== "qr") return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  // Dual detection: SSE stream + fallback HTTP polling every 2.5s
  useEffect(() => {
    if (step !== "qr" || !connectionId) return;

    let isDone = false;

    // 1. SSE subscription for real-time push
    const closeStream = openSseStream(
      `/api/v1/platform-connections/${connectionId}/events`,
      {
        onMessage: (msg) => {
          if (
            !isDone &&
            msg.type === "connection_state_changed" &&
            msg.data?.status === "connected"
          ) {
            isDone = true;
            closeStream();
            handleConnected();
          }
        },
        onError: () => {
          // Fallback polling continues regardless of SSE health
        },
      },
    );

    // 2. Active fallback polling (checks direct Evolution state)
    const pollInterval = setInterval(async () => {
      if (isDone) return;
      try {
        const evoState = await apiClient<{
          state: string;
          status: string;
        }>(`/api/v1/platform-connections/${connectionId}/evolution-connection-state`);

        if (
          !isDone &&
          (evoState.state === "open" || evoState.status === "connected")
        ) {
          isDone = true;
          clearInterval(pollInterval);
          closeStream();
          handleConnected();
        }
      } catch {
        // Ignore transient poll failures
      }
    }, 2500);

    return () => {
      isDone = true;
      closeStream();
      clearInterval(pollInterval);
    };
  }, [step, connectionId, handleConnected]);

  // Regenerate fresh QR code
  const handleRegenerateQr = useCallback(async () => {
    if (!connectionId || isRegenerating) return;
    setIsRegenerating(true);
    try {
      const result = await apiClient<{
        qrcode?: string;
        instance_name: string;
        status: string;
      }>(`/api/v1/platform-connections/${connectionId}/connect-evolution?regenerate=true`, {
        method: "POST",
      });

      if (result.status === "open" || result.status === "connected") {
        handleConnected();
        return;
      }

      if (result.qrcode) {
        setQrCode(result.qrcode);
        setTimeLeft(QR_LIFESPAN);
        toast.success("Nuevo código QR generado");
      } else {
        toast.error("No se pudo regenerar el QR. Intente de nuevo.");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al regenerar código QR",
      );
    } finally {
      setIsRegenerating(false);
    }
  }, [connectionId, isRegenerating, handleConnected]);

  const goToDetail = useCallback(() => {
    if (connectionId) {
      router.push(`/dashboard/platforms/evolution/${connectionId}`);
    }
  }, [connectionId, router]);

  const goBack = useCallback(() => {
    setStep("form");
    setQrCode(null);
    setErrorMsg(null);
    setTimeLeft(QR_LIFESPAN);
  }, []);

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
        setTimeLeft(QR_LIFESPAN);
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

  // Client is read-only on platforms (T2) — the create flow is unreachable.
  if (!canManagePlatforms(user?.current_role ?? user?.role)) {
    return <AccessDeniedCard />;
  }

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
              Abra WhatsApp en su teléfono y escanee este código para conectar.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 pb-8">
            <QrDisplay
              qrCode={qrCode}
              isPolling
              expiresInSeconds={timeLeft}
              onRefresh={handleRegenerateQr}
              isRefreshing={isRegenerating}
            />

            {timeLeft === 0 && (
              <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-center w-full max-w-xs">
                <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>El código QR expiró. Genere uno nuevo para vincular.</span>
                </div>
                <Button
                  onClick={handleRegenerateQr}
                  disabled={isRegenerating}
                  size="sm"
                  className="w-full gap-2 mt-1"
                >
                  <RefreshCw
                    className={`size-3.5 ${isRegenerating ? "animate-spin" : ""}`}
                  />
                  {isRegenerating ? "Generando..." : "Generar nuevo código QR"}
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              El sistema detectará automáticamente cuando escanee el código
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
