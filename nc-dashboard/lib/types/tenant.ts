/* ------------------------------------------------------------------ */
/*  Tenant — 1:1 con TenantResponse del backend                        */
/* ------------------------------------------------------------------ */

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  timezone: string;
  locale: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
