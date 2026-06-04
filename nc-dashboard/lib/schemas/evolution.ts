import { z } from "zod";

/**
 * Schema para crear conexión Evolution API.
 *
 * Ya no necesita base_url, api_key ni instance_name porque el backend
 * auto-completa esos valores desde la configuración del servidor Docker.
 * El admin solo elige el negocio, el agente (opcional) y un nombre.
 */
export const evolutionFormSchema = z.object({
  tenant_id: z.string().min(1, "Selecciona un negocio"),
  display_name: z.string().min(1, "El nombre de la conexión es requerido"),
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
  status: "active",
  is_primary: false,
  agent_id: null,
};
