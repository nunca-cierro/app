import type { Conversation, Platform } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Platform badge                                                      */
/* ------------------------------------------------------------------ */

export interface PlatformBadge {
  label: string;
  className: string;
}

export function getPlatformBadge(platform: Platform | undefined): PlatformBadge {
  switch (platform) {
    case "whatsapp":
      return {
        label: "WA",
        className:
          "rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400",
      };
    case "telegram":
      return {
        label: "TG",
        className:
          "rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      };
    default:
      return { label: "—", className: "" };
  }
}

/* ------------------------------------------------------------------ */
/*  Platform label                                                      */
/* ------------------------------------------------------------------ */

export function getPlatformLabel(platform: Platform | undefined): string {
  switch (platform) {
    case "whatsapp":
      return "WhatsApp";
    case "telegram":
      return "Telegram";
    default:
      return "";
  }
}

/* ------------------------------------------------------------------ */
/*  Platform filter                                                     */
/* ------------------------------------------------------------------ */

export type PlatformFilter = "all" | Platform | "other";

export function filterConversationsByPlatform(
  conversations: Conversation[],
  filter: PlatformFilter,
): Conversation[] {
  if (filter === "all") return conversations;

  return conversations.filter((conv) => {
    if (filter === "other") return !conv.platform;
    return conv.platform === filter;
  });
}
