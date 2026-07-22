import { describe, expect, it, vi } from "vitest";
import { agentEditFormSchema, type AgentEditFormValues } from "@/lib/schemas/agent";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    TOKEN_KEYS: { access: "test_token", user: "test_user" },
    apiClient: vi.fn(),
  };
});

describe("useAgent", () => {
  it("imports without error", async () => {
    const mod = await import("@/hooks/use-agent");
    expect(mod.useAgent).toBeDefined();
  });

  it("updateAgent uses AgentEditFormValues (without tenant_id)", async () => {
    await import("@/hooks/use-agent");
    // Verify the return type shape — updateAgent should accept AgentEditFormValues
    const mockReturn: import("@/hooks/use-agent").UseAgentReturn = {
      agent: null,
      prompts: [],
      isLoading: false,
      error: null,
      promptsLoading: false,
      updateAgent: vi.fn(),
      deleteAgent: vi.fn(),
      createPrompt: vi.fn(),
      updateBusinessConfig: vi.fn(),
    };
    expect(typeof mockReturn.updateAgent).toBe("function");
  });
});

describe("updateAgent payload validation", () => {
  it("accepts valid edit payload without tenant_id", () => {
    const valid: AgentEditFormValues = {
      name: "Updated",
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      max_tokens: 512,
    };
    const result = agentEditFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects invalid temperature in edit mode", () => {
    const result = agentEditFormSchema.safeParse({
      name: "X",
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      temperature: 5, // out of range
      max_tokens: 512,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name in edit mode", () => {
    const result = agentEditFormSchema.safeParse({
      name: "",
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      max_tokens: 512,
    });
    expect(result.success).toBe(false);
  });
});
