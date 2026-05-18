/* ------------------------------------------------------------------ */
/*  Platform types — WhatsApp & Telegram platform connections          */
/* ------------------------------------------------------------------ */

export type Platform = "whatsapp" | "telegram";

export interface PlatformConnection {
  id: string;
  tenant_id: string;
  platform: Platform;
  display_name: string;
  config: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
}
