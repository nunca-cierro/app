import { describe, expect, it } from "vitest";
import {
  agentFormSchema,
  agentEditFormSchema,
  type AgentFormValues,
  type AgentEditFormValues,
} from "@/lib/schemas/agent";

describe("agentFormSchema", () => {
  const validCreate: AgentFormValues = {
    tenant_id: "00000000-0000-0000-0000-000000000000",
    name: "Test Agent",
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    max_tokens: 512,
  };

  it("accepts valid create payload with tenant_id", () => {
    const result = agentFormSchema.safeParse(validCreate);
    expect(result.success).toBe(true);
  });

  it("rejects missing tenant_id in create mode", () => {
    const { tenant_id: _, ...withoutTenant } = validCreate;
    const result = agentFormSchema.safeParse(withoutTenant);
    expect(result.success).toBe(false);
  });

  it("rejects empty tenant_id", () => {
    const result = agentFormSchema.safeParse({ ...validCreate, tenant_id: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name shorter than 2 chars", () => {
    const result = agentFormSchema.safeParse({ ...validCreate, name: "A" });
    expect(result.success).toBe(false);
  });

  it("rejects temperature out of range", () => {
    const result = agentFormSchema.safeParse({ ...validCreate, temperature: 3 });
    expect(result.success).toBe(false);
  });

  it("rejects max_tokens below 64", () => {
    const result = agentFormSchema.safeParse({ ...validCreate, max_tokens: 32 });
    expect(result.success).toBe(false);
  });
});

describe("agentEditFormSchema", () => {
  const validEdit: AgentEditFormValues = {
    name: "Updated Agent",
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    temperature: 0.5,
    max_tokens: 1024,
  };

  it("accepts valid edit payload WITHOUT tenant_id", () => {
    const result = agentEditFormSchema.safeParse(validEdit);
    expect(result.success).toBe(true);
  });

  it("ignores tenant_id even if provided (stripped by .omit())", () => {
    const withTenant = { ...validEdit, tenant_id: "some-tenant" };
    const result = agentEditFormSchema.safeParse(withTenant);
    expect(result.success).toBe(true);
    if (result.success) {
      // tenant_id should be absent from parsed output
      expect(result.data).not.toHaveProperty("tenant_id");
    }
  });

  it("rejects invalid temperature (same validation as create)", () => {
    const result = agentEditFormSchema.safeParse({ ...validEdit, temperature: -1 });
    expect(result.success).toBe(false);
  });
});
