"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAgents } from "@/hooks/use-agents";
import { useTenants } from "@/hooks/use-tenants";
import { AgentForm } from "@/app/dashboard/agents/components/agent-form";
import { TemplateSelector } from "@/app/dashboard/agents/components/template-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ApiError } from "@/lib/api";
import { toast } from "sonner";
import type { AgentFormValues } from "@/lib/schemas/agent";
import type { AgentTemplate } from "@/lib/types";

export default function NewAgentPage() {
  const router = useRouter();
  const { createAgent, createAgentFromTemplate } = useAgents();
  const { tenants, isLoading: loadingTenants } = useTenants();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<AgentTemplate | null>(null);

  const handleSubmit = async (data: AgentFormValues) => {
    setIsSubmitting(true);

    try {
      if (selectedTemplate) {
        // Create from template
        const agent = await createAgentFromTemplate({
          tenant_id: data.tenant_id,
          template_id: selectedTemplate.id,
          name: data.name || undefined,
        });
        toast.success("Agente creado desde plantilla exitosamente");
        router.push(`/dashboard/agents/${agent.id}`);
      } else {
        // Regular creation
        const agent = await createAgent(data);
        toast.success("Agente creado exitosamente");
        router.push(`/dashboard/agents/${agent.id}`);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error("Error al crear el agente. Intenta de nuevo.");
      } else {
        toast.error("Error de conexión. Verifica tu conexión a internet.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/agents">
            <ArrowLeft className="mr-2 size-4" />
            Volver a Agentes
          </Link>
        </Button>
      </div>

      {/* ── Template selector ── */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold tracking-tight">
            Plantilla de configuración
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Elegí una plantilla para empezar con una configuración
            predefinida, o seleccioná &ldquo;Personalizado&rdquo; para configurar
            desde cero.
          </p>
        </CardHeader>
        <CardContent>
          <TemplateSelector
            onSelect={setSelectedTemplate}
            selectedId={selectedTemplate?.id ?? null}
          />
        </CardContent>
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold tracking-tight">
            {selectedTemplate
              ? `Nuevo Agente — ${selectedTemplate.name}`
              : "Nuevo Agente"}
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            {selectedTemplate
              ? "Completá los datos del agente. La configuración del negocio se cargará desde la plantilla."
              : "Crea un asistente de IA para un negocio."}
          </p>
        </CardHeader>
        <CardContent>
          <AgentForm
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
