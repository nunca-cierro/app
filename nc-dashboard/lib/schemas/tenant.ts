import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Business profile (template placeholders)                           */
/* ------------------------------------------------------------------ */

/** Keys a tenant may configure; mirrors nc-api PLACEHOLDER_KEYS. */
export const businessProfileSchema = z
  .object({
    business_name: z.string().max(200, "Máximo 200 caracteres").optional(),
    business_description: z
      .string()
      .max(1000, "Máximo 1000 caracteres")
      .optional(),
    business_schedule: z.string().max(200, "Máximo 200 caracteres").optional(),
    business_phone: z.string().max(60, "Máximo 60 caracteres").optional(),
    business_location: z.string().max(200, "Máximo 200 caracteres").optional(),
    business_website: z.string().max(300, "Máximo 300 caracteres").optional(),
    business_social: z.string().max(200, "Máximo 200 caracteres").optional(),
    business_cta: z.string().max(300, "Máximo 300 caracteres").optional(),
  })
  .strict()
  .optional();

export type BusinessProfileValues = z.infer<typeof businessProfileSchema>;

/* ------------------------------------------------------------------ */
/*  Tenant form schema                                                 */
/* ------------------------------------------------------------------ */

export const tenantFormSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  plan: z.enum(["basic", "professional", "enterprise", "trial"], {
    message: "Selecciona un plan válido",
  }),
  timezone: z.string().min(1, "Selecciona una zona horaria"),
  locale: z.string().min(1, "Selecciona un locale"),
  notes: z
    .string()
    .max(500, "Las notas no pueden exceder 500 caracteres")
    .optional()
    .or(z.literal("")),
  business_profile: businessProfileSchema,
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
