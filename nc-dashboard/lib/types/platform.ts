/* ------------------------------------------------------------------ */
/*  Platform types — WhatsApp & Telegram platform connections          */
/* ------------------------------------------------------------------ */

export type Platform = "whatsapp" | "telegram" | "evolution";

export interface PlatformConnection {
  id: string;
  tenant_id: string;
  platform_type: Platform;
  display_name: string;
  credentials?: Record<string, unknown> | null;
  agent_id?: string | null;
  extra_data: Record<string, unknown> | null;
  status: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}
