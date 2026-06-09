"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, ExternalLink } from "lucide-react";
import type { Conversation } from "@/lib/types";
import {
  getPlatformBadge,
  getPlatformLabel,
} from "@/app/dashboard/conversations/components/conversation-utils";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface ConversationListProps {
  conversations: Conversation[];
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
        <MessageSquare className="size-10 text-muted-foreground/50" />
        <p className="text-muted-foreground text-sm">
          No hay conversaciones aún. Cuando lleguen mensajes de WhatsApp
          o Telegram aparecerán aquí.
        </p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                            */
/* ------------------------------------------------------------------ */

function Skeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="py-4">
            <div className="mb-2 h-5 w-56 animate-pulse rounded bg-muted" />
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function ConversationList({
  conversations,
  isLoading,
  error,
}: ConversationListProps) {
  if (isLoading) return <Skeleton />;

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (conversations.length === 0) return <EmptyState />;

  return (
    <div className="space-y-2">
      {conversations.map((conv) => {
        const badge = getPlatformBadge(conv.platform);
        const platformLabel = getPlatformLabel(conv.platform);
        const displayUser = conv.external_user_id ?? conv.wa_user_id;

        return (
          <Link key={conv.id} href={`/dashboard/conversations/${conv.id}`}>
            <Card className="transition-colors hover:bg-accent/50">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="rounded-full bg-muted p-2 shrink-0">
                    <MessageSquare className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {/* Platform badge */}
                      {badge.label !== "—" && (
                        <span className={badge.className}>
                          {badge.label}
                        </span>
                      )}
                      {/* Platform label */}
                      {platformLabel && (
                        <span className="text-[10px] text-muted-foreground/60">
                          {platformLabel}
                        </span>
                      )}
                      <span className="truncate text-sm font-medium">
                        {displayUser}
                      </span>
                      <span
                        className={`inline-block size-1.5 shrink-0 rounded-full ${
                          conv.status === "active"
                            ? "bg-green-500"
                            : "bg-gray-400"
                        }`}
                      />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {conv.last_message_at
                        ? new Date(conv.last_message_at).toLocaleDateString("es-CO", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Sin actividad"}
                    </p>
                    <p className="text-[11px] text-muted-foreground/60">
                      {conv.message_count} mensajes
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
  );
}
