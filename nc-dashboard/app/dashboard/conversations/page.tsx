"use client";

import { useState, useMemo } from "react";
import { useConversations } from "@/hooks/use-conversations";
import { useAuth } from "@/hooks/use-auth";
import { ConversationList } from "@/app/dashboard/conversations/components/conversation-list";
import {
  filterConversationsByPlatform,
  type PlatformFilter,
} from "@/app/dashboard/conversations/components/conversation-utils";
import type { Conversation } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PlatformStats {
  total: number;
  whatsapp: number;
  telegram: number;
  other: number;
}

/* ------------------------------------------------------------------ */
/*  Pure: getPlatformBreakdown — testable without React                */
/* ------------------------------------------------------------------ */

export function getPlatformBreakdown(
  conversations: Conversation[],
): PlatformStats {
  const stats: PlatformStats = { total: conversations.length, whatsapp: 0, telegram: 0, other: 0 };
  for (const conv of conversations) {
    if (conv.platform === "whatsapp") stats.whatsapp++;
    else if (conv.platform === "telegram") stats.telegram++;
    else stats.other++;
  }
  return stats;
}

/* ------------------------------------------------------------------ */
/*  Filter options — dynamic based on available platforms              */
/* ------------------------------------------------------------------ */

function buildFilterOptions(breakdown: PlatformStats) {
  const options: { value: PlatformFilter; label: string; count: number }[] = [
    { value: "all", label: "Todas", count: breakdown.total },
  ];
  if (breakdown.whatsapp > 0) options.push({ value: "whatsapp", label: "WhatsApp", count: breakdown.whatsapp });
  if (breakdown.telegram > 0) options.push({ value: "telegram", label: "Telegram", count: breakdown.telegram });
  if (breakdown.other > 0) options.push({ value: "other", label: "Otras", count: breakdown.other });
  return options;
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function ConversationsPage() {
  const { user } = useAuth();
  const isClient = (user?.current_role ?? user?.role) === "client";
  const { conversations, isLoading, error } = useConversations({ limit: 50 });
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");

  const filtered = useMemo(
    () => filterConversationsByPlatform(conversations, platformFilter),
    [conversations, platformFilter],
  );

  const breakdown = useMemo(() => getPlatformBreakdown(conversations), [conversations]);
  const filterOptions = useMemo(() => buildFilterOptions(breakdown), [breakdown]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Conversaciones</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {isClient
            ? "Historial de conversaciones de tu negocio."
            : "Mensajes entrantes y salientes de todas las plataformas."}
        </p>
      </div>

      {/* Platform stats — only show active platforms */}
      {!isLoading && !error && breakdown.total > 0 && (
        <div className="flex flex-wrap gap-3">
          {filterOptions.slice(1).map((opt) => (
            <StatCard key={opt.value} label={opt.label} count={opt.count} active />
          ))}
        </div>
      )}

      {/* Platform filter — only if multiple platforms */}
      {filterOptions.length > 2 && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Filtrar:</label>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value as PlatformFilter)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {filterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({opt.count})
              </option>
            ))}
          </select>
        </div>
      )}

      <ConversationList conversations={filtered} isLoading={isLoading} error={error} />
    </div>
  );
}

function StatCard({ label, count, active }: { label: string; count: number; active: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2 text-center ${active ? "bg-card" : "bg-muted/30 opacity-60"}`}>
      <p className="text-lg font-bold tabular-nums">{count}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
