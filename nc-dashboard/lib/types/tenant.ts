export interface BusinessProfile {
  business_name?: string;
  business_description?: string;
  business_schedule?: string;
  business_phone?: string;
  business_location?: string;
  business_website?: string;
  business_social?: string;
  business_cta?: string;
}

/* ------------------------------------------------------------------ */
/*  Tenant - 1:1 con TenantResponse del backend                        */
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
  category?: string | null;
  business_profile?: BusinessProfile | null;
  created_at: string;
  updated_at: string;
  payment_status?: string | null;
  plan_activated_at?: string | null;
}
