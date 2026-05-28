import { z } from "zod";

export const evolutionFormSchema = z.object({
  tenant_id: z.string().min(1, "Selecciona un negocio"),
  display_name: z.string().min(1, "El nombre de la conexión es requerido"),
  base_url: z
    .string()
    .min(1, "La URL de Evolution API es requerida")
    .url("Debe ser una URL válida (ej: https://api.tu-servidor.com)"),
  api_key: z.string().optional().or(z.literal("")),
  instance_name: z
    .string()
    .min(1, "El nombre de la instancia es requerido")
    .regex(/^[a-zA-Z0-9_-]+$/, "El nombre no debe contener espacios ni caracteres especiales"),
  status: z.enum(["active", "inactive"], {
    message: "Selecciona un estado válido",
  }),
  is_primary: z.boolean(),
  agent_id: z.string().uuid().optional().nullable(),
});

export type EvolutionFormValues = z.infer<typeof evolutionFormSchema>;

export const defaultEvolutionValues: EvolutionFormValues = {
  tenant_id: "",
  display_name: "WhatsApp Evolution",
  base_url: "",
  api_key: "",
  instance_name: "",
  status: "active",
  is_primary: false,
  agent_id: null,
};
