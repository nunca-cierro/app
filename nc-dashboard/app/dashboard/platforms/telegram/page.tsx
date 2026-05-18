"use client";

import { usePlatformConnections } from "@/hooks/use-platform-connections";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Send, ExternalLink, Loader2 } from "lucide-react";

export default function TelegramConnectionsPage() {
  const { connections, isLoading, error } = usePlatformConnections("telegram");

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
          <h1 className="text-2xl font-bold tracking-tight">Telegram</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Bots de Telegram conectados a la plataforma.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/platforms/telegram/new">
            <Plus className="mr-2 size-4" />
            Conectar Bot
          </Link>
        </Button>
      </div>

      {connections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Send className="size-10 text-muted-foreground/50" />
            <p className="text-muted-foreground text-sm">
              No hay bots de Telegram conectados.
            </p>
            <Button asChild variant="default" size="sm">
              <Link href="/dashboard/platforms/telegram/new">
                <Plus className="mr-2 size-4" />
                Conectar Bot
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {connections.map((conn) => {
            const extraData = conn.extra_data as Record<string, string> | null;
            return (
              <Link
                key={conn.id}
                href={`/dashboard/platforms/telegram/${conn.id}`}
              >
                <Card className="transition-colors hover:bg-accent/50">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full border p-2">
                        <Send className="size-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {conn.display_name}
                          </span>
                          <span
                            className={`inline-block size-1.5 shrink-0 rounded-full ${
                              conn.status === "active"
                                ? "bg-green-500"
                                : "bg-gray-400"
                            }`}
                          />
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          @{extraData?.bot_username ?? "sin usuario"}
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="ml-4 size-4 shrink-0 text-muted-foreground" />
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
