/* ------------------------------------------------------------------ */
/*  Tenant — 1:1 con TenantResponse del backend                        */
/* ------------------------------------------------------------------ */

import type { AutoReply } from "./auto-reply";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  timezone: string;
  locale: string;
  notes: string | null;
  auto_replies?: AutoReply[];
  created_at: string;
  updated_at: string;
}
