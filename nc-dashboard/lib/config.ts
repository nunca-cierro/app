/* ------------------------------------------------------------------ */
/*  Application configuration                                          */
/* ------------------------------------------------------------------ */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL
  ?? process.env.NEXT_PUBLIC_API_URL_LOCAL
  ?? "http://localhost:8000";

/**
 * Slug of the platform's OWN tenant — exempt from payment enforcement in
 * the dashboard (attention list). Mirrors nc-api `INTERNAL_TENANT_SLUG`.
 * Empty string = no tenant is exempt (safe fallback). When adapting the
 * product to another business, set NEXT_PUBLIC_INTERNAL_TENANT_SLUG.
 */
export const INTERNAL_TENANT_SLUG =
  process.env.NEXT_PUBLIC_INTERNAL_TENANT_SLUG ?? "nuncacierro";
