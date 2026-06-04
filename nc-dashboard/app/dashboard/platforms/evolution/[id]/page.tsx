"use client";

import { useState, use, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePlatformConnection } from "@/hooks/use-platform-connections";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2 as CheckIcon,
  AlertCircle as AlertIcon,
  Loader2 as LoaderIcon,
  QrCode as QrIcon,
  ArrowLeft as BackIcon,
  Trash2 as TrashIcon,
} from "lucide-react";

type EvolutionState = "idle" | "connecting" | "qr" | "connected" | "error";

export default function PlatformEvolutionDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = use(paramsPromise);
  const router = useRouter();
  const { connection, isLoading, error, connectEvolution, refetchConnection, disconnectEvolution } = usePlatformConnection(params.id);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  /* ── Evolution connect state ──
   *
   * Architecture:
   * - `evoStatus` comes from connection.extra_data.connection_status.
   * - `evoState` is DERIVED from evoStatus at render time (no useEffect).
   * - `transient` only tracks user-triggered states (connecting, error, qrCode).
   * - The polling effect only manages the interval, never calls setState.
   */
  const extraData = connection?.extra_data as Record<string, unknown> | undefined;
  const evoStatus = extraData?.connection_status as string | undefined;

  const [transient, setTransient] = useState<{
    qrCode: string | null;
    errorMsg: string | null;
    isConnecting: boolean;
  }>({ qrCode: null, errorMsg: null, isConnecting: false });

  // Derive state from connection data at render time — no useEffect needed
  const derivedState: EvolutionState =
    !evoStatus || evoStatus === "disconnected"
      ? "idle"
      : evoStatus === "connected"
        ? "connected"
        : "qr"; // awaiting_scan or connecting

  // User-triggered states override derived state
  const evoState: EvolutionState = transient.isConnecting
    ? "connecting"
    : transient.errorMsg
      ? "error"
      : derivedState;

  const qrCode = transient.qrCode;
  const evoError = transient.errorMsg;

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Poll connection status when awaiting_scan or connecting ── */
  useEffect(() => {
    if (evoStatus === "awaiting_scan" || evoStatus === "connecting") {
      pollRef.current = setInterval(() => {
        refetchConnection();
      }, 5000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }

    // Cleanup when state changes away from waiting
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [evoStatus, refetchConnection]);



  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoaderIcon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !connection) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-destructive">{error || "Conexión no encontrada"}</p>
        </CardContent>
      </Card>
    );
  }

  const instanceName = connection.credentials?.instance_name as string | undefined;
  const baseUrl = connection.credentials?.base_url as string | undefined;

  /* ── Handlers ── */
  const handleConnect = async () => {
    setTransient({ qrCode: null, errorMsg: null, isConnecting: true });

    try {
      const result = await connectEvolution();
      if (result.qr_code) {
        setTransient({ qrCode: result.qr_code, errorMsg: null, isConnecting: false });
        toast.info("Escanea el código QR con WhatsApp para conectar la instancia");
      } else {
        setTransient({ qrCode: null, errorMsg: null, isConnecting: false });
        toast.success("Instancia de Evolution ya conectada");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al conectar Evolution";
      setTransient({ qrCode: null, errorMsg: msg, isConnecting: false });
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await disconnectEvolution();
      toast.success(result.detail || "Instancia eliminada correctamente");
      router.push("/dashboard/platforms/evolution");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al eliminar la instancia";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  /* ── Render ── */
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/platforms/evolution">
            <BackIcon className="mr-2 size-4" />
            Volver a Plataformas
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ── Connection Info Card ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Conexión Evolution</CardTitle>
              <div className="flex items-center gap-2">
                {/* Evolution connection status badge */}
                {evoStatus === "connected" ? (
                  <Badge variant="default" className="bg-green-600">WhatsApp conectado</Badge>
                ) : evoStatus === "awaiting_scan" || evoStatus === "connecting" ? (
                  <Badge variant="secondary" className="animate-pulse">Conectando...</Badge>
                ) : evoStatus === "disconnected" ? (
                  <Badge variant="destructive">Desconectado</Badge>
                ) : (
                  <Badge variant="outline">Sin conectar</Badge>
                )}
                {/* Our DB status */}
                <Badge variant={connection.status === "active" ? "default" : "secondary"} className="ml-1">
                  {connection.status === "active" ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </div>
            <CardDescription>{connection.display_name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Instancia:</span>
              <span className="text-muted-foreground font-mono text-xs">{instanceName || "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Servidor:</span>
              <span className="text-muted-foreground text-xs font-mono">{baseUrl || "—"}</span>
            </div>

            {/* QR display */}
            {evoState === "qr" && qrCode && (
              <div className="flex flex-col items-center gap-3 pt-2 border-t">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${qrCode}`}
                  alt="WhatsApp QR Code"
                  className="size-48 border rounded-lg"
                />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <LoaderIcon className="size-3 animate-spin" />
                  Esperando escaneo...
                </div>
              </div>
            )}

            {/* Connection status message when polling (QR not stored) */}
            {evoState === "qr" && !qrCode && evoStatus === "awaiting_scan" && (
              <div className="flex flex-col items-center gap-3 py-4 border-t text-sm text-muted-foreground">
                <LoaderIcon className="size-6 animate-spin" />
                <p>Código QR escaneado anteriormente — esperando conexión...</p>
              </div>
            )}

            {/* Connected state */}
            {evoState === "connected" && (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-green-600">
                <CheckIcon className="size-5" />
                WhatsApp conectado
              </div>
            )}

            {/* Error */}
            {evoState === "error" && evoError && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                {evoError}
              </div>
            )}

            {/* Connecting spinner */}
            {evoState === "connecting" && (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                <LoaderIcon className="size-4 animate-spin" />
                Conectando con Evolution API...
              </div>
            )}

            {/* Connect / Reconnect button */}
            <Button
              onClick={handleConnect}
              disabled={evoState === "connecting"}
              variant={evoState === "connected" ? "outline" : "default"}
              className="w-full"
            >
              {evoState === "connecting" ? (
                <LoaderIcon className="mr-2 size-4 animate-spin" />
              ) : (
                <QrIcon className="mr-2 size-4" />
              )}
              {evoState === "qr"
                ? "Esperando escaneo..."
                : evoState === "connected"
                  ? "Reconectar"
                  : "Conectar WhatsApp"}
            </Button>
          </CardContent>
        </Card>

        {/* ── Danger Zone: Delete Instance ── */}
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrashIcon className="size-5 text-destructive" />
              <CardTitle className="text-destructive">Zona de Peligro</CardTitle>
            </div>
            <CardDescription>
              Eliminar esta instancia la desconectará de WhatsApp y borrará todos los datos asociados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showDeleteConfirm ? (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <TrashIcon className="mr-2 size-4" />
                Eliminar Instancia
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-destructive">
                  ¿Estás seguro? Esta acción no se puede deshacer.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <LoaderIcon className="mr-2 size-4 animate-spin" />
                    ) : (
                      <TrashIcon className="mr-2 size-4" />
                    )}
                    Eliminar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
