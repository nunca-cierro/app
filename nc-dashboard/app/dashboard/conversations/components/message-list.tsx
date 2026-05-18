"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import type { Conversation, Message } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface MessageListProps {
  conversation: Conversation;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function MessageList({
  conversation,
  messages,
  isLoading,
  error,
}: MessageListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8">
          <AlertCircle className="size-5 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (messages.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No hay mensajes en esta conversación.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-1">
      {/* ── Header info ── */}
      <div className="mb-4 rounded-lg border bg-muted/30 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Usuario: <span className="font-medium">{conversation.wa_user_id}</span>
          {" · "}
          {conversation.message_count} mensajes
          {conversation.last_message_at &&
            ` · Último: ${new Date(conversation.last_message_at).toLocaleString("es-CO")}`}
        </p>
      </div>

      {/* ── Messages ── */}
      <div className="space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.direction === "in" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.direction === "in"
                  ? "rounded-tl-sm bg-muted"
                  : "rounded-tr-sm bg-primary text-primary-foreground"
              }`}
            >
              {msg.message_type === "text" ? (
                <p className="whitespace-pre-wrap break-words">
                  {msg.content}
                </p>
              ) : (
                <div className="space-y-1">
                  <p className="whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                  <span className="text-[10px] opacity-70">
                    Tipo: {msg.message_type}
                  </span>
                </div>
              )}

              <div
                className={`mt-1 flex items-center gap-1 text-[10px] ${
                  msg.direction === "in"
                    ? "text-muted-foreground/60"
                    : "text-primary-foreground/60"
                }`}
              >
                {new Date(msg.created_at).toLocaleTimeString("es-CO", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {msg.direction === "out" && (
                  <span>
                    {msg.status === "sent"
                      ? " ✓"
                      : msg.status === "delivered"
                        ? " ✓✓"
                        : msg.status === "read"
                          ? " ✓✓"
                          : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
