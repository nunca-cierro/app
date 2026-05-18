import { describe, expect, it } from "vitest";
import {
  telegramConnectionSchema,
  type TelegramConnectionFormValues,
} from "@/lib/schemas/telegram";

describe("telegram connection schema", () => {
  it("accepts valid telegram connection data", () => {
    const data: TelegramConnectionFormValues = {
      tenant_id: "00000000-0000-0000-0000-000000000000",
      display_name: "Bot de Soporte",
      bot_token: "1234567890:ABCdefGHIjklmNOPqrSTUvWXyz",
      bot_username: "MySupportBot",
      status: "active",
    };
    const result = telegramConnectionSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects missing bot_token", () => {
    const data = {
      display_name: "Bot",
      bot_token: "",
      bot_username: "MyBot",
      status: "active",
    };
    const result = telegramConnectionSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("bot_token");
    }
  });

  it("rejects invalid bot_token format (no colon)", () => {
    const data = {
      display_name: "Bot",
      bot_token: "invalidtokenwithoutcolon",
      bot_username: "MyBot",
      status: "active",
    };
    const result = telegramConnectionSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("bot_token");
    }
  });

  it("rejects bot_token with invalid prefix (non-numeric before colon)", () => {
    const data = {
      display_name: "Bot",
      bot_token: "abc:def",
      bot_username: "MyBot",
      status: "active",
    };
    const result = telegramConnectionSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("bot_token");
    }
  });

  it("rejects missing display_name", () => {
    const data = {
      display_name: "",
      bot_token: "1234567890:ABCdef",
      bot_username: "MyBot",
      status: "active",
    };
    const result = telegramConnectionSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("display_name");
    }
  });

  it("accepts inactive status", () => {
    const data: TelegramConnectionFormValues = {
      tenant_id: "00000000-0000-0000-0000-000000000000",
      display_name: "Bot Inactivo",
      bot_token: "1234567890:ABCdefGHIjklmNOPqrSTUvWXyz",
      bot_username: "InactiveBot",
      status: "inactive",
    };
    const result = telegramConnectionSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("validates token format: bot_token should match Telegram pattern", () => {
    // Telegram bot tokens are: <numeric-id>:<alphanumeric-secret>
    const validTokens = [
      "123456:ABCdef123",
      "9876543210:AAaaAAaaAA_aaAAaaAAaaAAaa",
      "0:a",
    ];
    for (const token of validTokens) {
      const result = telegramConnectionSchema.safeParse({
        display_name: "Bot",
        bot_token: token,
        bot_username: "Bot",
        status: "active",
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid token format patterns", () => {
    const invalidTokens = [
      "no-digits-here:abcdef",
      "123:",
      "12345",
      "not-a-token",
      ":just-secret",
    ];
    for (const token of invalidTokens) {
      const result = telegramConnectionSchema.safeParse({
        display_name: "Bot",
        bot_token: token,
        bot_username: "Bot",
        status: "active",
      });
      expect(result.success).toBe(false);
    }
  });
});
