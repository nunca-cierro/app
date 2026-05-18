"use client";

import Link from "next/link";
import { usePlatformConnections } from "@/hooks/use-platform-connections";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Send, Loader2, ExternalLink } from "lucide-react";

const PLATFORM_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  telegram: "Telegram",
};

const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  whatsapp: Phone,
  telegram: Send,
};

export default function PlatformsPage() {
  const { connections, isLoading, error } = usePlatformConnections();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plataformas</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Conexiones a plataformas de mensajería.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/platforms/whatsapp/new">
              <Phone className="mr-2 size-4" />
              WhatsApp
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/dashboard/platforms/telegram/new">
              <Send className="mr-2 size-4" />
              Telegram
            </Link>
          </Button>
        </div>
      </div>

      {connections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <p className="text-muted-foreground text-sm">
              No hay conexiones configuradas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {connections.map((conn) => {
            const Icon =
              PLATFORM_ICONS[conn.platform] ?? ExternalLink;
            const platformLabel = PLATFORM_LABELS[conn.platform] ?? conn.platform;

            return (
              <Link
                key={conn.id}
                href={`/dashboard/platforms/${conn.platform}/${conn.id}`}
              >
                <Card className="transition-colors hover:bg-accent/50">
                  <CardContent className="flex items-start gap-3 py-4">
                    <div className="rounded-full border p-2">
                      <Icon className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {conn.display_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {platformLabel}
                        {" · "}
                        {conn.status === "active" ? "Activo" : "Inactivo"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
