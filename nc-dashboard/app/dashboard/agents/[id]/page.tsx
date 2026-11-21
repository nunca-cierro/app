"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAgent } from "@/hooks/use-agent";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Trash2,
  Loader2,
  AlertCircle,
  BookOpen,
  Bot,
} from "lucide-react";
import { KnowledgeManager } from "@/app/dashboard/knowledge/components/knowledge-manager";
import { AgentSettingsForm } from "@/app/dashboard/agents/components/agent-settings-form";
import { ApiError } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { CAPABILITIES, hasCapability } from "@/lib/capabilities";

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const {
    agent,
    isLoading,
    error,
    updateAgent,
    deleteAgent,
    updateBusinessConfig,
  } = useAgent(id);

  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("config");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /* ── Capability gates ── */
  const effectiveRole = user?.current_role ?? user?.role;
  const isOperator = effectiveRole === "admin" || effectiveRole === "superadmin";
  const canManageAgents = isOperator && hasCapability(user, CAPABILITIES.agentsManage);

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/agents">
            <ArrowLeft className="mr-2 size-4" />
            Volver a Agentes
          </Link>
        </Button>
        <Card>
          <CardContent className="flex items-center gap-3 py-8">
            <AlertCircle className="size-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/agents">
            <ArrowLeft className="mr-2 size-4" />
            Volver a Agentes
          </Link>
        </Button>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              Agente no encontrado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Handle Delete ── */
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAgent();
      toast.success("Agente eliminado");
      router.replace("/dashboard/agents");
    } catch {
      toast.error("Error al eliminar el agente.");
    } finally {
      setIsDeleting(false);
    }
  };

  /* ── Handle Unified Save ── */
  const handleSaveSettings = async (data: {
    name: string;
    provider: "openai" | "groq";
    model: string;
    instructions: string;
    keywords_to_escalate: string[];
    fallback_message: string;
  }) => {
    if (!agent) return;
    setIsSubmitting(true);
    try {
      await updateAgent({
        name: data.name,
        provider: data.provider,
        model: data.model,
        temperature: agent.temperature,
        max_tokens: agent.max_tokens,
      });

      await updateBusinessConfig({
        ...(agent.business_config || {}),
        instructions: data.instructions,
        keywords_to_escalate: data.keywords_to_escalate,
        fallback_message: data.fallback_message,
      });

      toast.success("Configuración del agente guardada correctamente");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Error al guardar cambios.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Navigation & Actions ── */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/agents">
            <ArrowLeft className="mr-2 size-4" />
            Volver a Agentes
          </Link>
        </Button>

        {canManageAgents && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 size-4" />
                Eliminar Agente
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar agente?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Se eliminará permanentemente{" "}
                  {agent.name} y sus configuraciones asociadas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    "Eliminar"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="config">
            <Bot className="mr-2 size-4" />
            Configuración y Tono
          </TabsTrigger>
          <TabsTrigger value="knowledge">
            <BookOpen className="mr-2 size-4" />
            Base de Conocimiento
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Configuración y Tono ── */}
        <TabsContent value="config" className="mt-6">
          <AgentSettingsForm
            agent={agent}
            onSave={handleSaveSettings}
            isSaving={isSubmitting}
          />
        </TabsContent>

        {/* ── Tab 2: Base de Conocimiento ── */}
        <TabsContent value="knowledge" className="mt-6">
          <KnowledgeManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
