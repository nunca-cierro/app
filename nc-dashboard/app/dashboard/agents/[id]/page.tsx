"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAgent } from "@/hooks/use-agent";
import { useTenants } from "@/hooks/use-tenants";
import { AgentInfo } from "@/app/dashboard/agents/components/agent-info";
import { AgentForm } from "@/app/dashboard/agents/components/agent-form";
import { PromptEditor } from "@/app/dashboard/agents/components/prompt-editor";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  MessageSquareText,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import { toast } from "sonner";
import type { AgentFormValues, PromptFormValues } from "@/lib/schemas/agent";

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const {
    agent,
    prompts,
    isLoading,
    error,
    updateAgent,
    deleteAgent,
    createPrompt,
    promptsLoading,
  } = useAgent(id);

  const { tenants, isLoading: loadingTenants } = useTenants();

  const [activeTab, setActiveTab] = useState("info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  /* ── Handle update ── */
  const handleUpdate = async (data: AgentFormValues) => {
    setIsSubmitting(true);
    try {
      await updateAgent(data);
      toast.success("Agente actualizado exitosamente");
      setActiveTab("info");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error("Error al actualizar. Intenta de nuevo.");
      } else {
        toast.error("Error de conexión.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Handle delete ── */
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

  /* ── Handle create prompt ── */
  const handleCreatePrompt = async (data: PromptFormValues) => {
    try {
      await createPrompt(data);
      toast.success("Prompt guardado como nueva versión");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Error de conexión.";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Navigation ── */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/agents">
            <ArrowLeft className="mr-2 size-4" />
            Volver a Agentes
          </Link>
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 size-4" />
              Eliminar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar agente?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente{" "}
                {agent.name} y todos sus prompts asociados.
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
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="prompt">
            <MessageSquareText className="mr-2 size-4" />
            System Prompt
          </TabsTrigger>
          <TabsTrigger value="edit">
            <Pencil className="mr-2 size-4" />
            Editar
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Info ── */}
        <TabsContent value="info" className="mt-6">
          <AgentInfo agent={agent} />
        </TabsContent>

        {/* ── Tab: Prompt ── */}
        <TabsContent value="prompt" className="mt-6">
          <PromptEditor
            prompts={prompts}
            onCreatePrompt={handleCreatePrompt}
            isSubmitting={promptsLoading}
          />
        </TabsContent>

        {/* ── Tab: Edit ── */}
        <TabsContent value="edit" className="mt-6">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold tracking-tight">
                Editar Agente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AgentForm
                defaultValues={{
                  name: agent.name,
                  description: agent.description ?? "",
                  provider: agent.provider as "groq" | "openai" | "anthropic",
                  model: agent.model,
                  temperature: agent.temperature,
                  max_tokens: agent.max_tokens,
                }}
                onSubmit={handleUpdate}
                isSubmitting={isSubmitting}
                mode="edit"
                tenants={tenants}
                tenantsLoading={loadingTenants}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
