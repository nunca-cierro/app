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
  agent_id: z.string().uuid().optional().nullable(),
});

export type EvolutionFormValues = z.infer<typeof evolutionFormSchema>;

export const defaultEvolutionValues: EvolutionFormValues = {
  tenant_id: "",
  display_name: "WhatsApp Evolution",
  status: "active",
  agent_id: null,
};

/* ------------------------------------------------------------------ */
/*  Anti-spam config (PlatformConnection.extra_data.anti_spam)         */
/* ------------------------------------------------------------------ */

/**
 * Saved anti-spam settings, stored by the backend in
 * `PlatformConnection.extra_data.anti_spam` and enforced per-message by
 * `nc-api/app/modules/evolution/anti_spam.py` (`DEFAULT_CONFIG`).
 */
export const ANTI_SPAM_MODES = ["log", "block"] as const;

export type AntiSpamMode = (typeof ANTI_SPAM_MODES)[number];

export function isAntiSpamMode(value: unknown): value is AntiSpamMode {
  return (
    typeof value === "string" &&
    (ANTI_SPAM_MODES as readonly string[]).includes(value)
  );
}

export interface ResolvedAntiSpamConfig {
  /** False when `extra_data.anti_spam` is absent (connection never configured). */
  configured: boolean;
  /** Effective enabled flag; backend defaults to `true` when missing. */
  enabled: boolean;
  /** Saved mode validated against the backend vocabulary; null when missing/unknown. */
  mode: AntiSpamMode | null;
}

/**
 * Resolve the saved anti-spam config from raw `extra_data.anti_spam`.
 *
 * Missing/unknown values never fall back to a mode silently: the caller
 * receives `mode: null` so the UI can show an explicit "unconfigured" state
 * instead of pretending the first option is active.
 */
export function resolveAntiSpamConfig(raw: unknown): ResolvedAntiSpamConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { configured: false, enabled: true, mode: null };
  }
  const { enabled, mode } = raw as Record<string, unknown>;
  return {
    configured: true,
    enabled: enabled !== false,
    mode: isAntiSpamMode(mode) ? mode : null,
  };
}
