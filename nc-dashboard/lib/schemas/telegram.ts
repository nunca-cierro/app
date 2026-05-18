import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Telegram Connection form schema                                     */
/* ------------------------------------------------------------------ */

/**
 * Telegram bot token format: <numeric-id>:<secret>
 * Example: "1234567890:ABCdefGHIjklmNOPqrSTUvWXyz"
 */
const botTokenRegex = /^\d+:[\w-]+$/;

export const telegramConnectionSchema = z.object({
  tenant_id: z.string().min(1, "Selecciona un negocio"),
  display_name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  bot_token: z
    .string()
    .min(1, "El token del bot es requerido")
    .regex(botTokenRegex, "Token inválido. Debe ser el token de un bot de Telegram (ID:SECRET)"),
  bot_username: z
    .string()
    .min(1, "El nombre de usuario del bot es requerido")
    .max(100, "El nombre de usuario no puede exceder 100 caracteres"),
  status: z.enum(["active", "inactive"], {
    message: "Selecciona un estado válido",
  }),
});

export type TelegramConnectionFormValues = z.infer<
  typeof telegramConnectionSchema
>;

/* ------------------------------------------------------------------ */
/*  Default values                                                     */
/* ------------------------------------------------------------------ */

export const defaultTelegramConnectionValues: TelegramConnectionFormValues = {
  display_name: "",
  bot_token: "",
  bot_username: "",
  status: "active",
};
