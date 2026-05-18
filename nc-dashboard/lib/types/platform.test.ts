import { describe, expect, it } from "vitest";
import type { Platform, PlatformConnection } from "@/lib/types/platform";
import type { Conversation } from "@/lib/types";

describe("Platform types", () => {
  it("verifies PlatformConnection shape at runtime", () => {
    const conn: PlatformConnection = {
      id: "pc_123",
      tenant_id: "tenant_1",
      platform: "whatsapp",
      display_name: "WhatsApp Principal",
      config: { phone_number_id: "12345" },
      status: "active",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };
    expect(conn.id).toBe("pc_123");
    expect(conn.tenant_id).toBe("tenant_1");
    expect(conn.platform).toBe("whatsapp");
    expect(conn.display_name).toBe("WhatsApp Principal");
    expect(conn.config).toEqual({ phone_number_id: "12345" });
    expect(conn.status).toBe("active");
    expect(conn.created_at).toBe("2024-01-01T00:00:00Z");
    expect(conn.updated_at).toBe("2024-01-01T00:00:00Z");
  });

  it("accepts both platform values", () => {
    const wp: Platform = "whatsapp" as Platform;
    const tg: Platform = "telegram" as Platform;
    expect([wp, tg]).toContain("whatsapp");
    expect([wp, tg]).toContain("telegram");
  });

  it("accepts telegram platform with bot config", () => {
    const conn: PlatformConnection = {
      id: "pc_456",
      tenant_id: "tenant_1",
      platform: "telegram",
      display_name: "Bot de Soporte",
      config: { bot_token: "123:ABC", bot_username: "MyBot" },
      status: "active",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };
    expect(conn.platform).toBe("telegram");
    expect((conn.config as Record<string, string>).bot_token).toBe("123:ABC");
  });

  it("Conversation includes new platform fields", () => {
    const conv: Conversation = {
      id: "conv_1",
      tenant_id: "tenant_1",
      whatsapp_number_id: "wn_1",
      wa_user_id: "user_1",
      platform_connection_id: "pc_1",
      external_user_id: "ext_user_1",
      platform: "whatsapp",
      status: "active",
      summary: null,
      last_message_at: null,
      message_count: 0,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };
    expect(conv.platform_connection_id).toBe("pc_1");
    expect(conv.external_user_id).toBe("ext_user_1");
    expect(conv.platform).toBe("whatsapp");
    // Old fields still present
    expect(conv.whatsapp_number_id).toBe("wn_1");
    expect(conv.wa_user_id).toBe("user_1");
  });
});
