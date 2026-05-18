"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ExternalLink, Bot } from "lucide-react";
import type { Agent } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface AgentListProps {
  agents: Agent[];
  isLoading: boolean;
  error: string | null;
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                         */
/* ------------------------------------------------------------------ */

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12">
        <Bot className="size-10 text-muted-foreground/50" />
        <p className="text-muted-foreground text-sm">
          No hay agentes creados aún.
        </p>
        <Button asChild variant="default" size="sm">
          <Link href="/dashboard/agents/new">
            <Plus className="mr-2 size-4" />
            Crear Agente
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                            */
/* ------------------------------------------------------------------ */

function Skeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="py-4">
            <div className="mb-2 h-5 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  List                                                               */
/* ------------------------------------------------------------------ */

export function AgentList({ agents, isLoading, error }: AgentListProps) {
  if (isLoading) {
    return <Skeleton />;
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

  if (agents.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-2">
      {agents.map((agent) => (
        <Link key={agent.id} href={`/dashboard/agents/${agent.id}`}>
          <Card
            className={`transition-colors hover:bg-accent/50 ${
              !agent.enabled ? "opacity-60" : ""
            }`}
          >
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-start gap-3">
                <Bot className="mt-0.5 size-5 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {agent.name}
                    </span>
                    {!agent.enabled && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {agent.provider}/{agent.model}
                  </p>
                </div>
              </div>
              <ExternalLink className="ml-4 size-4 shrink-0 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
