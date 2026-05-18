"use client";

import { useAgents } from "@/hooks/use-agents";
import { AgentList } from "@/app/dashboard/agents/components/agent-list";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function AgentsPage() {
  const { agents, isLoading, error } = useAgents();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agentes</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gestiona los asistentes de IA de cada negocio.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/agents/new">
            <Plus className="mr-2 size-4" />
            Nuevo Agente
          </Link>
        </Button>
      </div>

      <AgentList agents={agents} isLoading={isLoading} error={error} />
    </div>
  );
}
