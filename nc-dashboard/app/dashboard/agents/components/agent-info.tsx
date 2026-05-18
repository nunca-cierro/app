"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Cpu, Thermometer, Hash, Globe, ToggleLeft } from "lucide-react";
import type { Agent } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface AgentInfoProps {
  agent: Agent;
}

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
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function AgentInfo({ agent }: AgentInfoProps) {
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{agent.name}</h1>
          {agent.description && (
            <p className="text-muted-foreground mt-1 text-sm">
              {agent.description}
            </p>
          )}
        </div>
      </div>

      {/* ── Details ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Configuración del Modelo
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <InfoRow
              icon={Cpu}
              label="Proveedor"
              value={agent.provider}
            />
            <InfoRow
              icon={Bot}
              label="Modelo"
              value={agent.model}
            />
            <InfoRow
              icon={Thermometer}
              label="Temperatura"
              value={String(agent.temperature)}
            />
            <InfoRow
              icon={Hash}
              label="Máx. tokens"
              value={agent.max_tokens.toLocaleString()}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <InfoRow
              icon={ToggleLeft}
              label="Estado"
              value={agent.enabled ? "Activo" : "Inactivo"}
            />
            <InfoRow
              icon={Globe}
              label="Creado"
              value={new Date(agent.created_at).toLocaleDateString("es-CO", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
