"use client";

import { useState, useMemo } from "react";
import { useConversations } from "@/hooks/use-conversations";
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
  const stats: PlatformStats = {
    total: conversations.length,
    whatsapp: 0,
    telegram: 0,
    other: 0,
  };

  for (const conv of conversations) {
    if (conv.platform === "whatsapp") stats.whatsapp++;
    else if (conv.platform === "telegram") stats.telegram++;
    else stats.other++;
  }

  return stats;
}

/* ------------------------------------------------------------------ */
/*  Filter options                                                      */
/* ------------------------------------------------------------------ */

const FILTER_OPTIONS: { value: PlatformFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telegram", label: "Telegram" },
  { value: "other", label: "Otras" },
];

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function ConversationsPage() {
  const { conversations, isLoading, error } = useConversations({ limit: 50 });
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");

  const filtered = useMemo(
    () => filterConversationsByPlatform(conversations, platformFilter),
    [conversations, platformFilter],
  );

  const breakdown = useMemo(
    () => getPlatformBreakdown(conversations),
    [conversations],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Conversaciones</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Mensajes entrantes y salientes de todas las plataformas.
        </p>
      </div>

      {/* ── Platform stats ── */}
      {!isLoading && !error && breakdown.total > 0 && (
        <div className="flex flex-wrap gap-3">
          <StatCard label="Total" count={breakdown.total} active />
          <StatCard
            label="WhatsApp"
            count={breakdown.whatsapp}
            active={breakdown.whatsapp > 0}
          />
          <StatCard
            label="Telegram"
            count={breakdown.telegram}
            active={breakdown.telegram > 0}
          />
          <StatCard
            label="Otras"
            count={breakdown.other}
            active={breakdown.other > 0}
          />
        </div>
      )}

      {/* ── Platform filter ── */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground">Filtrar:</label>
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value as PlatformFilter)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <ConversationList
        conversations={filtered}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  StatCard                                                           */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  count,
  active,
}: {
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-center ${
        active ? "bg-card" : "bg-muted/30 opacity-60"
      }`}
    >
      <p className="text-lg font-bold tabular-nums">{count}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
