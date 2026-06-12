/* ------------------------------------------------------------------ */
/*  Auth types — 1:1 con TokenResponse y UserResponse del backend      */
/* ------------------------------------------------------------------ */

export type UserRole = "superadmin" | "admin" | "agent" | "client";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenant_id: string | null;
  current_role?: UserRole;
  current_tenant_id?: string | null;
  plan?: string | null;
  payment_status?: string | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
  name: string;
  role: UserRole;
  tenant_id: string | null;
  tenant_plan?: string | null;
  payment_status?: string | null;
  plan_activated_at?: string | null;
}

export interface TenantAssociation {
  tenant_id: string;
  tenant_name: string;
  role: string;
  is_primary: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  tenants: TenantAssociation[];
}

/** Minimal tenant info returned by GET /api/v1/tenants (list). */
export interface TenantEntry {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
}
