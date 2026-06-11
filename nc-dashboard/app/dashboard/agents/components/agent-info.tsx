"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Cpu,
  Thermometer,
  Hash,
  Globe,
  Store,
  Clock,
  MapPin,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import type { Agent } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface AgentInfoProps {
  agent: Agent;
  plan?: string | null;
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
/*  Plan badge helper                                                   */
/* ------------------------------------------------------------------ */

function planLabel(plan: string | null | undefined): string {
  switch (plan) {
    case "basic": return "Básico";
    case "professional": return "Profesional";
    case "enterprise": return "Empresarial";
    case "trial": return "Trial";
    default: return plan ?? "—";
  }
}

function usesAI(plan: string | null | undefined): boolean {
  return plan === "professional" || plan === "enterprise";
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function AgentInfo({ agent, plan }: AgentInfoProps) {
  const biz = agent.business_config;
  const hasAI = usesAI(plan);

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
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={agent.enabled ? "default" : "secondary"}>
              {agent.enabled ? "Activo" : "Inactivo"}
            </Badge>
            {plan && (
              <Badge variant={hasAI ? "default" : "outline"}>
                {hasAI ? "🤖 IA" : "📋 Programado"} · {planLabel(plan)}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* ── How it works ── */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            {hasAI ? (
              <Bot className="mt-0.5 size-5 text-blue-600 shrink-0" />
            ) : (
              <MessageSquare className="mt-0.5 size-5 text-amber-600 shrink-0" />
            )}
            <div className="text-sm space-y-1">
              {hasAI ? (
                <>
                  <p className="font-medium text-blue-800">
                    Inteligencia Artificial activa
                  </p>
                  <p className="text-blue-700">
                    Las respuestas se generan con IA usando toda la información
                    del negocio configurada abajo (instrucciones, productos, FAQ,
                    horarios). El modelo entiende el contexto de la conversación.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-amber-800">
                    Respuestas programadas (sin IA)
                  </p>
                  <p className="text-amber-700">
                    Las respuestas se generan buscando coincidencias entre lo que
                    pregunta el cliente y las <strong>Preguntas Frecuentes</strong>{" "}
                    configuradas abajo. Si una pregunta del FAQ comparte al menos
                    2 palabras con el mensaje del cliente, se envía la respuesta
                    correspondiente. Las palabras clave de derivación también se
                    verifican.
                  </p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Model Config — only if IA enabled ── */}
      {hasAI && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Configuración del Modelo
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <InfoRow icon={Cpu} label="Proveedor" value={agent.provider} />
            <InfoRow icon={Bot} label="Modelo" value={agent.model} />
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
      )}

      {/* ── Business Info ── */}
      {biz?.business_info && Object.keys(biz.business_info).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              <Store className="inline size-4 mr-2" />
              Datos del Negocio
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {biz.business_info.name && (
              <InfoRow icon={Store} label="Nombre" value={biz.business_info.name} />
            )}
            {biz.business_info.description && (
              <InfoRow icon={MessageSquare} label="Descripción" value={biz.business_info.description} />
            )}
            {biz.business_info.schedule && (
              <InfoRow icon={Clock} label="Horarios" value={biz.business_info.schedule} />
            )}
            {biz.business_info.location && (
              <InfoRow icon={MapPin} label="Ubicación" value={biz.business_info.location} />
            )}
            {biz.business_info.phone && (
              <InfoRow icon={Globe} label="Teléfono" value={biz.business_info.phone} />
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Products/Services ── */}
      {biz?.products_services && biz.products_services.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Productos / Servicios ({biz.products_services.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {biz.products_services.map((p, i) => (
                <div key={i} className="flex justify-between py-2 text-sm">
                  <span>{p.name}</span>
                  {p.price && (
                    <span className="text-muted-foreground">{p.price}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── FAQ ── */}
      {biz?.faq && biz.faq.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Preguntas Frecuentes ({biz.faq.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {hasAI
                ? "La IA usa estas preguntas como referencia."
                : "El bot busca coincidencias entre el mensaje del cliente y estas preguntas (≥2 palabras)."}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {biz.faq.map((f, i) => (
                <div key={i} className="text-sm">
                  <p className="font-medium text-amber-700">{f.question}</p>
                  <p className="text-muted-foreground mt-0.5">{f.answer}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Escalate Keywords ── */}
      {biz?.keywords_to_escalate && biz.keywords_to_escalate.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              <AlertTriangle className="inline size-4 mr-2 text-amber-500" />
              Derivación a Humano
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {biz.keywords_to_escalate.map((kw) => (
                <Badge key={kw} variant="outline" className="text-xs">
                  {kw}
                </Badge>
              ))}
            </div>
            {biz.fallback_message && (
              <p className="text-xs text-muted-foreground mt-3">
                Mensaje: {biz.fallback_message}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Timestamps ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Historial</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <InfoRow
            icon={Globe}
            label="Creado"
            value={new Date(agent.created_at).toLocaleDateString("es-CO", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
          <InfoRow
            icon={Globe}
            label="Actualizado"
            value={new Date(agent.updated_at).toLocaleDateString("es-CO", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
