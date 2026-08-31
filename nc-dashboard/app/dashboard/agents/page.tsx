"use client";

import { useAgents } from "@/hooks/use-agents";
import { AgentList } from "@/app/dashboard/agents/components/agent-list";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { canSeeQuickActions } from "@/lib/rbac";

/**
 * Agents-page header "Nuevo Agente" action — superadmin-only (RV-4).
 * Mirrors the dashboard quick-action gate via canSeeQuickActions().
 */
export function NewAgentHeaderButton({
  role,
}: {
  role?: string | null;
}) {
  if (!canSeeQuickActions(role)) return null;
  return (
    <Button asChild size="sm">
      <Link href="/dashboard/agents/new">
        <Plus className="mr-2 size-4" />
        Nuevo Agente
      </Link>
    </Button>
  );
}

export default function AgentsPage() {
  const { agents, isLoading, error } = useAgents();
  const { user } = useAuth();
  const role = user?.current_role ?? user?.role;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agentes</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gestiona los asistentes de IA de cada negocio.
          </p>
        </div>
        <NewAgentHeaderButton role={role} />
      </div>

      <AgentList agents={agents} isLoading={isLoading} error={error} />
    </div>
  );
}