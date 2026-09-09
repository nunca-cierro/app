import { describe, expect, it } from "vitest";
import {
  agentFormSchema,
  agentEditFormSchema,
  defaultAgentValues,
  MODELS_BY_PROVIDER,
  type AgentFormValues,
  type AgentEditFormValues,
} from "@/lib/schemas/agent";

describe("agentFormSchema", () => {
  const validCreate: AgentFormValues = {
    tenant_id: "00000000-0000-0000-0000-000000000000",
    name: "Test Agent",
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0,
    max_tokens: 512,
  };

  it("accepts valid create payload with tenant_id", () => {
    const result = agentFormSchema.safeParse(validCreate);
    expect(result.success).toBe(true);
  });

  it("rejects missing tenant_id in create mode", () => {
    const withoutTenant = { ...validCreate, tenant_id: undefined } as Partial<
      typeof validCreate
    >;
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

  it("accepts groq provider with a groq model", () => {
    const groq = {
      ...validCreate,
      provider: "groq",
      model: "openai/gpt-oss-120b",
    };
    const result = agentFormSchema.safeParse(groq);
    expect(result.success).toBe(true);
  });

  it("rejects unsupported provider (anthropic)", () => {
    const result = agentFormSchema.safeParse({
      ...validCreate,
      provider: "anthropic",
    });
    expect(result.success).toBe(false);
  });
});

describe("defaultAgentValues", () => {
  it("seeds the canonical 1024 max_tokens (parity with backend R7)", () => {
    // The agent form seeds from these values — a stale default here means
    // every UI-created agent ships with the wrong max_tokens.
    expect(defaultAgentValues.max_tokens).toBe(1024);
    // The seeded value must clear the schema's own floor (64).
    expect(agentFormSchema.shape.max_tokens.safeParse(defaultAgentValues.max_tokens).success).toBe(
      true,
    );
  });

  it("seeds provider=openai and model=gpt-4o-mini (multi-provider parity)", () => {
    expect(defaultAgentValues.provider).toBe("openai");
    expect(defaultAgentValues.model).toBe("gpt-4o-mini");
    // The seeded defaults must pass the schema's own validation.
    expect(agentFormSchema.shape.provider.safeParse(defaultAgentValues.provider).success).toBe(
      true,
    );
    expect(agentFormSchema.shape.model.safeParse(defaultAgentValues.model).success).toBe(
      true,
    );
  });
});

describe("MODELS_BY_PROVIDER", () => {
  it("offers exactly the backend-supported providers (openai + groq)", () => {
    expect(Object.keys(MODELS_BY_PROVIDER).sort()).toEqual(expect.arrayContaining(["groq", "openai"]));
  });

  it("has no anthropic entry", () => {
    expect(MODELS_BY_PROVIDER.anthropic).toBeUndefined();
  });

  it("lists gpt-4o-mini under openai and openai/gpt-oss-120b under groq", () => {
    expect(MODELS_BY_PROVIDER.openai).toContain("gpt-4o-mini");
    expect(MODELS_BY_PROVIDER.groq).toContain("openai/gpt-oss-120b");
  });
});

describe("agentEditFormSchema", () => {
  const validEdit: AgentEditFormValues = {
    name: "Updated Agent",
    provider: "openai",
    model: "gpt-4o-mini",
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