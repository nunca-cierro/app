import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  WhatsApp Number form schema                                        */
/* ------------------------------------------------------------------ */

export const whatsappNumberFormSchema = z.object({
  tenant_id: z.string().min(1, "Selecciona un negocio"),
  phone_number_id: z
    .string()
    .min(1, "El ID del número es requerido"),
  waba_id: z
    .string()
    .min(1, "El WABA ID es requerido"),
  display_phone_number: z
    .string()
    .min(1, "El número telefónico es requerido")
    .regex(
      /^\+?\d{7,15}$/,
      "Debe ser un número válido (ej: +573001234567)",
    ),
  verified_name: z
    .string()
    .max(100, "El nombre no puede exceder 100 caracteres")
    .optional()
    .or(z.literal("")),
  status: z.enum(["active", "inactive", "disconnected"], {
    message: "Selecciona un estado válido",
  }),
  is_primary: z.boolean(),
});

export type WhatsAppNumberFormValues = z.infer<
  typeof whatsappNumberFormSchema
>;

/* ------------------------------------------------------------------ */
/*  Default values                                                     */
/* ------------------------------------------------------------------ */

export const defaultWhatsappNumberValues: WhatsAppNumberFormValues = {
  tenant_id: "",
  phone_number_id: "",
  waba_id: "",
  display_phone_number: "",
  verified_name: "",
  status: "active",
  is_primary: false,
};
