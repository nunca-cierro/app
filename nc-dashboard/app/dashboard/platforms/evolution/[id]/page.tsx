"use client";

import { useState, use } from "react";
import Link from "next/link";
import { usePlatformConnection } from "@/hooks/use-platform-connections";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  CheckCircle2 as CheckIcon, 
  AlertCircle as AlertIcon, 
  ExternalLink as LinkIcon, 
  Globe as GlobeIcon,
  Loader2 as LoaderIcon,
  ArrowLeft as BackIcon
} from "lucide-react";

export default function PlatformEvolutionDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = use(paramsPromise);
  const { connection, isLoading, error, registerWebhook } = usePlatformConnection(params.id);
  const [isRegistering, setIsRegistering] = useState(false);
  const [baseUrlOverride, setBaseUrlOverride] = useState("");

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

  const handleRegisterWebhook = async () => {
    setIsRegistering(true);
    try {
      await registerWebhook(baseUrlOverride || undefined);
      toast.success("Webhook registrado correctamente en Evolution API");
    } catch (err) {
      console.error("Error registering webhook:", err);
      const detail = err instanceof Error ? err.message : "Verifica la conexión.";
      toast.error(`Error al registrar el webhook: ${detail}`);
    } finally {
      setIsRegistering(false);
    }
  };

  const hasWebhook = !!connection.extra_data?.webhook_url;

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
        {/* ── Status Card ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Estado de Conexión</CardTitle>
              <Badge variant={connection.status === "active" ? "default" : "secondary"}>
                {connection.status === "active" ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            <CardDescription>{connection.display_name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Instancia:</span>
              <span className="text-muted-foreground">{(connection.credentials?.instance_name as string) || "N/A"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Servidor:</span>
              <a 
                href={connection.credentials?.base_url as string} 
                target="_blank" 
                className="text-primary hover:underline flex items-center gap-1"
              >
                {(connection.credentials?.base_url as string) || "N/A"}
                <LinkIcon className="size-3" />
              </a>
            </div>
          </CardContent>
        </Card>

        {/* ── Webhook Registration Card ── */}
        <Card className={hasWebhook ? "border-green-200 bg-green-50/30" : "border-amber-200 bg-amber-50/30"}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Configuración de Webhook</CardTitle>
              {hasWebhook ? (
                <CheckIcon className="size-5 text-green-600" />
              ) : (
                <AlertIcon className="size-5 text-amber-600" />
              )}
            </div>
            <CardDescription>
              Vincula Evolution API con este servidor para recibir mensajes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">
                Override de URL (Opcional)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <GlobeIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input 
                    placeholder="https://tu-ngrok-o-dominio.com" 
                    className="pl-9"
                    value={baseUrlOverride}
                    onChange={(e) => setBaseUrlOverride(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleRegisterWebhook} 
                  disabled={isRegistering}
                >
                  {isRegistering ? <LoaderIcon className="size-4 animate-spin" /> : "Vincular"}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Usa este campo si estás en local con ngrok. Si no, déjalo vacío para usar la URL de producción.
              </p>
            </div>

            {hasWebhook && (
              <div className="rounded-md bg-background p-3 border text-[11px] break-all font-mono">
                <span className="text-muted-foreground block mb-1 font-sans">URL Registrada:</span>
                {(connection.extra_data as Record<string, unknown>)?.webhook_url as string}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
