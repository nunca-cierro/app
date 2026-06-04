import { describe, expect, it } from "vitest";
import {
  evolutionFormSchema,
  type EvolutionFormValues,
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
