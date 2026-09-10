/**
 * Slug of the platform's OWN tenant — exempt from payment enforcement in
 * the dashboard (attention list). Mirrors nc-api `Settings.internal_tenant_slug`
 * (default "nunca-cierro"). Empty string = no tenant is exempt (safe fallback).
 * When adapting the product to another business, set NEXT_PUBLIC_INTERNAL_TENANT_SLUG.
 */
export const INTERNAL_TENANT_SLUG =
  process.env.NEXT_PUBLIC_INTERNAL_TENANT_SLUG ?? "nunca-cierro";
