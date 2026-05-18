/* ------------------------------------------------------------------ */
/*  Platform types — WhatsApp & Telegram platform connections          */
/* ------------------------------------------------------------------ */

export type Platform = "whatsapp" | "telegram";

export interface PlatformConnection {
  id: string;
  tenant_id: string;
  platform_type: Platform;
  display_name: string;
  extra_data: Record<string, unknown> | null;
  status: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}
