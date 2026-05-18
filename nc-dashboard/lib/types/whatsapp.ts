/* ------------------------------------------------------------------ */
/*  WhatsAppNumber — 1:1 con WhatsAppNumberResponse del backend         */
/* ------------------------------------------------------------------ */

export interface WhatsAppNumber {
  id: string;
  tenant_id: string;
  phone_number_id: string;
  waba_id: string;
  display_phone_number: string;
  verified_name: string | null;
  status: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}
