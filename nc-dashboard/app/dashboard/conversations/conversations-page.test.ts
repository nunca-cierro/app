import { describe, expect, it } from "vitest";
import {
  getPlatformBreakdown,
  type PlatformStats,
} from "@/app/dashboard/conversations/page";
import type { Conversation } from "@/lib/types";

function makeConv(
  overrides: Partial<Conversation>,
): Conversation {
  const defaults = {
    tenant_id: "t1",
    whatsapp_number_id: "wn1",
    wa_user_id: "user1",
    status: "active" as const,
    summary: null as string | null,
    last_message_at: null as string | null,
    message_count: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };
  return { ...defaults, ...overrides } as Conversation;
}

describe("platform breakdown", () => {
  it("returns zero stats for empty conversations", () => {
    const stats = getPlatformBreakdown([]);
    expect(stats.total).toBe(0);
    expect(stats.whatsapp).toBe(0);
    expect(stats.telegram).toBe(0);
    expect(stats.other).toBe(0);
  });

  it("counts whatsapp conversations", () => {
    const conversations: Conversation[] = [
      makeConv({ id: "1", platform: "whatsapp" }),
      makeConv({ id: "2", platform: "whatsapp" }),
      makeConv({ id: "3", platform: "telegram" }),
    ];
    const stats = getPlatformBreakdown(conversations);
    expect(stats.total).toBe(3);
    expect(stats.whatsapp).toBe(2);
    expect(stats.telegram).toBe(1);
    expect(stats.other).toBe(0);
  });

  it("counts conversations without platform as 'other'", () => {
    const conversations: Conversation[] = [
      makeConv({ id: "1", platform: "whatsapp" }),
      makeConv({ id: "2", platform: undefined }),
      makeConv({ id: "3", platform: undefined }),
    ];
    const stats = getPlatformBreakdown(conversations);
    expect(stats.whatsapp).toBe(1);
    expect(stats.other).toBe(2);
  });

  it("includes all platform stats", () => {
    const conversations: Conversation[] = [
      makeConv({ id: "1", platform: "whatsapp" }),
      makeConv({ id: "2", platform: "telegram" }),
      makeConv({ id: "3", platform: undefined }),
    ];
    const stats = getPlatformBreakdown(conversations);
    expect(stats).toEqual<PlatformStats>({
      total: 3,
      whatsapp: 1,
      telegram: 1,
      other: 1,
    });
  });
});
