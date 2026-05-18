import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Tenant form schema                                                 */
/* ------------------------------------------------------------------ */

export const tenantFormSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  plan: z.enum(["basic", "pro", "enterprise"], {
    message: "Selecciona un plan válido",
  }),
  timezone: z.string().min(1, "Selecciona una zona horaria"),
  locale: z.string().min(1, "Selecciona un locale"),
  notes: z
    .string()
    .max(500, "Las notas no pueden exceder 500 caracteres")
    .optional()
    .or(z.literal("")),
});

export type TenantFormValues = z.infer<typeof tenantFormSchema>;

/* ------------------------------------------------------------------ */
/*  Default values for the form                                        */
/* ------------------------------------------------------------------ */

export const defaultTenantValues: TenantFormValues = {
  name: "",
  plan: "basic",
  timezone: "America/Bogota",
  locale: "es-CO",
  notes: "",
};
