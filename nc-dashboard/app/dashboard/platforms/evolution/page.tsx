"use client";

import Link from "next/link";
import { usePlatformConnections } from "@/hooks/use-platform-connections";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Loader2, Plus } from "lucide-react";

export default function EvolutionPlatformsPage() {
  const { connections, isLoading, error } = usePlatformConnections("evolution");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WhatsApp (Evolution)</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gestiona tus instancias de Evolution API conectadas.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/platforms/evolution/new">
            <Plus className="mr-2 size-4" />
            Nueva Conexión
          </Link>
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4 text-center text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {connections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <p className="text-muted-foreground text-sm">
              No hay instancias de Evolution configuradas.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/platforms/evolution/new">Configurar primera instancia</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {connections.map((conn) => (
            <Link
              key={conn.id}
              href={`/dashboard/platforms/evolution/${conn.id}`}
            >
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="flex items-start gap-3 py-4">
                  <div className="rounded-full border p-2 bg-green-500/10">
                    <Phone className="size-4 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {conn.display_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Instancia: {conn.credentials?.instance_name}
                      {" · "}
                      {conn.status === "active" ? "Activo" : "Inactivo"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
