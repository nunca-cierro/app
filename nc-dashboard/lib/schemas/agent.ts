import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  AiAgent form schema                                                */
/* ------------------------------------------------------------------ */

export const agentFormSchema = z.object({
  tenant_id: z.string().min(1, "Selecciona un negocio"),
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  description: z
    .string()
    .max(500, "La descripción no puede exceder 500 caracteres")
    .optional()
    .or(z.literal("")),
  provider: z.enum(["groq", "openai", "anthropic"], {
    message: "Selecciona un proveedor válido",
  }),
  model: z.string().min(1, "Selecciona un modelo"),
  temperature: z.number()
    .min(0, "Mínimo 0")
    .max(2, "Máximo 2"),
  max_tokens: z.number()
    .int()
    .min(64, "Mínimo 64 tokens")
    .max(8192, "Máximo 8192 tokens"),
});

export type AgentFormValues = z.infer<typeof agentFormSchema>;

/* ------------------------------------------------------------------ */
/*  Prompt form schema                                                 */
/* ------------------------------------------------------------------ */

export const promptFormSchema = z.object({
  content: z
    .string()
    .min(10, "El prompt debe tener al menos 10 caracteres")
    .max(10000, "El prompt no puede exceder 10000 caracteres"),
  type: z.enum(["system", "user"], {
    message: "Tipo de prompt inválido",
  }),
});

export type PromptFormValues = z.infer<typeof promptFormSchema>;

/* ------------------------------------------------------------------ */
/*  Default values                                                     */
/* ------------------------------------------------------------------ */

export const defaultAgentValues: AgentFormValues = {
  tenant_id: "",
  name: "",
  description: "",
  provider: "groq",
  model: "llama-3.3-70b-versatile",
  temperature: 0.7,
  max_tokens: 512,
};

/** Models disponibles por proveedor */
export const MODELS_BY_PROVIDER: Record<string, string[]> = {
  groq: [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
    "gemma2-9b-it",
  ],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
  anthropic: ["claude-sonnet-4-20250514", "claude-haiku-3-5-20241022"],
};
