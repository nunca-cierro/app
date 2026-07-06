"use client";

import { useState, use, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePlatformConnection } from "@/hooks/use-platform-connections";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrDisplay } from "@/app/dashboard/platforms/evolution/components/qr-display";
import { toast } from "sonner";
import {
  CheckCircle2 as CheckIcon,
  Loader2 as LoaderIcon,
  QrCode as QrIcon,
  ArrowLeft as BackIcon,
  Trash2 as TrashIcon,
  ShieldCheck as ShieldIcon,
  ShieldAlert as ShieldOffIcon,
} from "lucide-react";

type EvolutionState = "idle" | "connecting" | "qr" | "connected" | "error" | "timeout";

export default function PlatformEvolutionDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = use(paramsPromise);
  const router = useRouter();
  const { connection, isLoading, error, connectEvolution, refetchConnection, disconnectEvolution, updateConnection } = usePlatformConnection(params.id);
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

  const [pollTimedOut, setPollTimedOut] = useState(false);

  // Derive state from connection data at render time — no useEffect needed
  const derivedState: EvolutionState =
    !evoStatus || evoStatus === "disconnected"
      ? "idle"
      : evoStatus === "connected"
        ? "connected"
        : pollTimedOut
          ? "timeout"
          : "qr"; // awaiting_scan or connecting

  // User-triggered states override derived state
  const evoState: EvolutionState = transient.isConnecting
    ? "connecting"
    : transient.errorMsg
      ? "error"
      : derivedState;

  // QR from extra_data survives page refreshes; transient QR overrides on fresh connect
  const persistedQr = extraData?.qrcode_image as string | undefined;
  const qrCode = transient.qrCode ?? persistedQr ?? null;
  const evoError = transient.errorMsg;

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);
  const MAX_POLLS = 12; // 60 seconds at 5s intervals

  /* ── Poll connection status when awaiting_scan or connecting ── */
  useEffect(() => {
    if (evoStatus === "awaiting_scan" || evoStatus === "connecting") {
      pollCountRef.current = 0;

      pollRef.current = setInterval(() => {
        pollCountRef.current += 1;

        if (pollCountRef.current >= MAX_POLLS) {
          // Timeout — stop polling, show manual-check state
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setPollTimedOut(true);
          return;
        }

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
    // Reset timeout when status changes
    setPollTimedOut(false);
  }, [evoStatus, refetchConnection]);

  /* ── Anti-spam state ── */
  const antiSpamConfig = extraData?.anti_spam as Record<string, unknown> | undefined;
  const [antiSpamEnabled, setAntiSpamEnabled] = useState(
    antiSpamConfig?.enabled !== false,
  );
  const [antiSpamMode, setAntiSpamMode] = useState(
    (antiSpamConfig?.mode as string) || "log",
  );
  const [isSavingAntiSpam, setIsSavingAntiSpam] = useState(false);

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

  // Credentials are encrypted server-side and NEVER returned via the API.
  // Instead, non-sensitive fields are exposed in extra_data.
  const instanceName = extraData?.instance_name as string | undefined;
  const baseUrl = extraData?.base_url as string | undefined;

  const handleSaveAntiSpam = async () => {
    setIsSavingAntiSpam(true);
    try {
      const currentExtra = { ...(connection?.extra_data || {}) };
      currentExtra.anti_spam = {
        enabled: antiSpamEnabled,
        mode: antiSpamMode,
      };
      await updateConnection({ extra_data: currentExtra });
      toast.success("Configuración anti-spam guardada");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al guardar";
      toast.error(msg);
    } finally {
      setIsSavingAntiSpam(false);
    }
  };

  /* ── Handlers ── */
  const handleConnect = async () => {
    setTransient({ qrCode: null, errorMsg: null, isConnecting: true });
    setPollTimedOut(false);

    try {
      const result = await connectEvolution();
      if (result.qrcode) {
        setTransient({ qrCode: result.qrcode, errorMsg: null, isConnecting: false });
        toast.success("QR generado", {
          description: "Compártelo con tu cliente para que escanee desde WhatsApp.",
        });
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
        {/* ── QR Card — el producto que le vendés al cliente ── */}
        <Card className={evoState === "qr" && qrCode ? "md:col-span-2" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{connection.display_name}</CardTitle>
              <div className="flex items-center gap-2">
                {/* Evolution connection status badge */}
                {evoStatus === "connected" ? (
                  <Badge variant="default" className="bg-green-600">WhatsApp conectado</Badge>
                ) : evoStatus === "awaiting_scan" || evoStatus === "connecting" ? (
                  <Badge variant="secondary" className="animate-pulse">Esperando escaneo...</Badge>
                ) : evoStatus === "disconnected" ? (
                  <Badge variant="destructive">Desconectado</Badge>
                ) : (
                  <Badge variant="outline">Sin conectar</Badge>
                )}
              </div>
            </div>
            <CardDescription>
              {evoState === "qr" && qrCode
                ? "Comparte este QR con tu cliente para que conecte su WhatsApp"
                : "Generá un QR para que tu cliente conecte su WhatsApp al sistema"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ── Connection details (subtle, background info) ── */}
            {instanceName && (
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground/60">
                <span>Instancia: <span className="font-mono">{instanceName}</span></span>
                {baseUrl && <span>·</span>}
                {baseUrl && <span>Servidor: <span className="font-mono">{baseUrl?.replace(/^https?:\/\//, "").replace(/:.*/, "")}</span></span>}
              </div>
            )}

            {/* ── QR display (prominent, center of attention) ── */}
            {evoState === "qr" && qrCode && (
              <div className="pt-4 border-t">
                <QrDisplay
                  qrCode={qrCode}
                  isPolling
                  size="size-72"
                  connectionName={connection.display_name}
                />
              </div>
            )}

            {/* Polling without QR (QR was scanned but webhook not received yet) */}
            {evoState === "qr" && !qrCode && evoStatus === "awaiting_scan" && (
              <div className="flex flex-col items-center gap-3 py-4 border-t text-sm text-muted-foreground">
                <LoaderIcon className="size-6 animate-spin" />
                <p>Esperando confirmación de WhatsApp...</p>
              </div>
            )}

            {/* Timeout: polling exceeded max attempts */}
            {evoState === "timeout" && (
              <div className="flex flex-col items-center gap-3 py-4 border-t text-sm">
                <p className="text-amber-600 font-medium">
                  Sin confirmación aún
                </p>
                <p className="text-muted-foreground text-xs text-center max-w-xs">
                  El QR sigue activo. Si tu cliente ya lo escaneó, presiona
                  "Verificar" para confirmar la conexión.
                </p>
                <Button
                  onClick={refetchConnection}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <CheckIcon className="size-4" />
                  Verificar conexión
                </Button>
              </div>
            )}

            {/* Connected state */}
            {evoState === "connected" && (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-green-600">
                <CheckIcon className="size-5" />
                WhatsApp conectado — tu cliente ya está activo
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
              <div className="flex flex-col items-center gap-3 py-4 text-sm">
                <LoaderIcon className="size-6 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Generando QR para tu cliente...</p>
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
              {evoState === "qr" || evoState === "timeout"
                ? "Generar nuevo QR"
                : evoState === "connected"
                  ? "Generar QR para otro cliente"
                  : "Generar QR para cliente"}
            </Button>
          </CardContent>
        </Card>

        {/* ── Anti-Spam Config ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              {antiSpamEnabled ? (
                <ShieldIcon className="size-5 text-green-600" />
              ) : (
                <ShieldOffIcon className="size-5 text-muted-foreground" />
              )}
              <CardTitle>Anti-Spam</CardTitle>
            </div>
            <CardDescription>
              Filtra mensajes automáticos, repetitivos o flooding de clientes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ── Enabled toggle ── */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Activar filtro anti-spam</label>
                <p className="text-xs text-muted-foreground">
                  Cuando está desactivado, todos los mensajes se procesan normalmente.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={antiSpamEnabled}
                onClick={() => setAntiSpamEnabled(!antiSpamEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  antiSpamEnabled ? "bg-green-600" : "bg-input"
                }`}
              >
                <span
                  className={`pointer-events-none block size-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                    antiSpamEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* ── Mode selector ── */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Modo de acción</label>
              <select
                value={antiSpamMode}
                onChange={(e) => setAntiSpamMode(e.target.value)}
                disabled={!antiSpamEnabled}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="log">Solo registrar (log)</option>
                <option value="block">Bloquear</option>
              </select>
              <p className="text-xs text-muted-foreground">
                <strong>Log:</strong> detecta y registra, pero el bot sigue respondiendo.
                {" "}<strong>Bloquear:</strong> ignora el mensaje sin responder.
              </p>
            </div>

            {/* ── Save button ── */}
            <Button
              onClick={handleSaveAntiSpam}
              disabled={isSavingAntiSpam}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {isSavingAntiSpam ? (
                <LoaderIcon className="mr-2 size-4 animate-spin" />
              ) : (
                <ShieldIcon className="mr-2 size-4" />
              )}
              Guardar configuración anti-spam
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
