"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useConversation } from "@/hooks/use-conversation";
import { MessageList } from "@/app/dashboard/conversations/components/message-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";

export default function ConversationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { conversation, messages, isLoading, error } = useConversation(id);

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
          <Link href="/dashboard/conversations">
            <ArrowLeft className="mr-2 size-4" />
            Volver a Conversaciones
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

  if (!conversation) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/conversations">
            <ArrowLeft className="mr-2 size-4" />
            Volver a Conversaciones
          </Link>
        </Button>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              Conversación no encontrada.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Back ── */}
      <Button asChild variant="ghost" size="sm">
        <Link href="/dashboard/conversations">
          <ArrowLeft className="mr-2 size-4" />
          Volver a Conversaciones
        </Link>
      </Button>

      {/* ── Messages ── */}
      <MessageList
        conversation={conversation}
        messages={messages}
        isLoading={false}
        error={null}
      />
    </div>
  );
}
