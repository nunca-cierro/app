import { describe, expect, it } from "vitest";
import {
  evolutionFormSchema,
  type EvolutionFormValues,
  isAntiSpamMode,
  resolveAntiSpamConfig,
} from "@/lib/schemas/evolution";

describe("evolution connection schema", () => {
  it("accepts valid evolution connection data with agent_id", () => {
    const data: EvolutionFormValues = {
      tenant_id: "00000000-0000-0000-0000-000000000000",
      display_name: "WhatsApp Evolution",
      status: "active",
      agent_id: "11111111-1111-4111-8111-111111111111",
    };
    const result = evolutionFormSchema.safeParse(data);
    if (!result.success) {
      console.log(JSON.stringify(result.error.issues, null, 2));
    }
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveProperty("agent_id", "11111111-1111-4111-8111-111111111111");
    }
  });

  it("accepts null agent_id", () => {
    const data: EvolutionFormValues = {
      tenant_id: "00000000-0000-0000-0000-000000000000",
      display_name: "WhatsApp Evolution",
      status: "active",
      agent_id: null,
    };
    const result = evolutionFormSchema.safeParse(data);
    if (!result.success) {
      console.log(JSON.stringify(result.error.issues, null, 2));
    }
    expect(result.success).toBe(true);
  });
});

describe("isAntiSpamMode", () => {
  it("accepts the backend vocabulary (log, block)", () => {
    expect(isAntiSpamMode("log")).toBe(true);
    expect(isAntiSpamMode("block")).toBe(true);
  });

  it("rejects missing, empty and unknown values", () => {
    expect(isAntiSpamMode(undefined)).toBe(false);
    expect(isAntiSpamMode(null)).toBe(false);
    expect(isAntiSpamMode("")).toBe(false);
    expect(isAntiSpamMode("aggressive")).toBe(false);
    expect(isAntiSpamMode(42)).toBe(false);
  });
});

describe("resolveAntiSpamConfig", () => {
  it("returns unconfigured state when extra_data.anti_spam is missing", () => {
    expect(resolveAntiSpamConfig(undefined)).toEqual({
      configured: false,
      enabled: true,
      mode: null,
    });
    expect(resolveAntiSpamConfig(null)).toEqual({
      configured: false,
      enabled: true,
      mode: null,
    });
    expect(resolveAntiSpamConfig("garbage")).toEqual({
      configured: false,
      enabled: true,
      mode: null,
    });
  });

  it("resolves a saved block mode", () => {
    expect(resolveAntiSpamConfig({ enabled: true, mode: "block" })).toEqual({
      configured: true,
      enabled: true,
      mode: "block",
    });
  });

  it("resolves a saved log mode", () => {
    expect(resolveAntiSpamConfig({ enabled: true, mode: "log" })).toEqual({
      configured: true,
      enabled: true,
      mode: "log",
    });
  });

  it("never falls back to a mode silently when it is missing or unknown", () => {
    expect(resolveAntiSpamConfig({ enabled: true })).toEqual({
      configured: true,
      enabled: true,
      mode: null,
    });
    expect(resolveAntiSpamConfig({ enabled: true, mode: "aggressive" })).toEqual({
      configured: true,
      enabled: true,
      mode: null,
    });
    expect(resolveAntiSpamConfig({})).toEqual({
      configured: true,
      enabled: true,
      mode: null,
    });
  });

  it("reflects the saved enabled=false flag", () => {
    expect(resolveAntiSpamConfig({ enabled: false, mode: "block" })).toEqual({
      configured: true,
      enabled: false,
      mode: "block",
    });
  });

  it("defaults enabled to true (backend default) when missing", () => {
    expect(resolveAntiSpamConfig({ mode: "log" })).toEqual({
      configured: true,
      enabled: true,
      mode: "log",
    });
  });
});
