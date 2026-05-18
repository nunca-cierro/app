import { describe, expect, it } from "vitest";
import {
  getPlatformBadge,
  getPlatformLabel,
  filterConversationsByPlatform,
} from "@/app/dashboard/conversations/components/conversation-utils";
import type { Conversation } from "@/lib/types";

describe("platform badge logic", () => {
  it("returns whatsapp badge for whatsapp platform", () => {
    const badge = getPlatformBadge("whatsapp");
    expect(badge.label).toBe("WA");
    expect(typeof badge.className).toBe("string");
  });

  it("returns telegram badge for telegram platform", () => {
    const badge = getPlatformBadge("telegram");
    expect(badge.label).toBe("TG");
    expect(typeof badge.className).toBe("string");
  });

  it("returns default badge for unknown platform", () => {
    const badge = getPlatformBadge(undefined);
    expect(badge.label).toBe("—");
  });

  it("whatsapp badge has green styling", () => {
    const badge = getPlatformBadge("whatsapp");
    expect(badge.className).toContain("green");
  });

  it("telegram badge has blue styling", () => {
    const badge = getPlatformBadge("telegram");
    expect(badge.className).toContain("blue");
  });
});

describe("platform label", () => {
  it("returns WhatsApp for whatsapp", () => {
    expect(getPlatformLabel("whatsapp")).toBe("WhatsApp");
  });

  it("returns Telegram for telegram", () => {
    expect(getPlatformLabel("telegram")).toBe("Telegram");
  });

  it("returns empty string for undefined", () => {
    expect(getPlatformLabel(undefined)).toBe("");
  });
});

describe("filter conversations by platform", () => {
  const conversations: Conversation[] = [
    {
      id: "1",
      tenant_id: "t1",
      whatsapp_number_id: "wn1",
      wa_user_id: "wa_user_1",
      platform: "whatsapp",
      status: "active",
      summary: null,
      last_message_at: null,
      message_count: 1,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    {
      id: "2",
      tenant_id: "t1",
      whatsapp_number_id: "wn1",
      wa_user_id: "tg_user_1",
      platform: "telegram",
      status: "active",
      summary: null,
      last_message_at: null,
      message_count: 1,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    {
      id: "3",
      tenant_id: "t1",
      whatsapp_number_id: "wn1",
      wa_user_id: "wa_user_2",
      platform: "whatsapp",
      status: "active",
      summary: null,
      last_message_at: null,
      message_count: 1,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    {
      id: "4",
      tenant_id: "t1",
      whatsapp_number_id: "wn1",
      wa_user_id: "legacy_user",
      platform: undefined,
      status: "active",
      summary: null,
      last_message_at: null,
      message_count: 1,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  ];

  it("returns all when filter is 'all'", () => {
    const result = filterConversationsByPlatform(conversations, "all");
    expect(result).toHaveLength(4);
  });

  it("filters by whatsapp", () => {
    const result = filterConversationsByPlatform(conversations, "whatsapp");
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("1");
    expect(result[1].id).toBe("3");
  });

  it("filters by telegram", () => {
    const result = filterConversationsByPlatform(conversations, "telegram");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("filters by 'other' (no platform)", () => {
    const result = filterConversationsByPlatform(conversations, "other");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("4");
  });

  it("returns empty array for non-matching filter", () => {
    const result = filterConversationsByPlatform([conversations[0]], "telegram");
    expect(result).toHaveLength(0);
  });
});
