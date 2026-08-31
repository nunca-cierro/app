/**
 * Server/client-shared route guard used by the Next.js proxy (proxy.ts).
 *
 * Two modes:
 * - Slice B (current): the backend sets an httpOnly `nc_access_token` JWT
 *   cookie that the proxy CAN read server-side (cookies ride along on page
 *   navigations). When present, its role claim is decoded (UNVERIFIED — the
 *   backend enforces authorization; the proxy only steers redirects) and
 *   applied against the ROLE_ROUTE_MATRIX from lib/rbac.ts.
 * - Fallback: no session cookie → authenticated-vs-not via the lightweight
 *   `nc_signed_in` marker cookie the client sets after
 *   login/register/switch-tenant/silent-restore and clears on logout/401.
 */

import { getRoleLandingRoute, isRouteAllowed } from "@/lib/rbac";
import type { UserRole } from "@/lib/types";

export const SIGNED_IN_COOKIE = "nc_signed_in";

/** httpOnly session cookie name (Slice B) — set by the backend, read by the proxy. */
export const ACCESS_TOKEN_COOKIE = "nc_access_token";

/** Roles the proxy understands (matches lib/types/auth.ts UserRole). */
export const VALID_ROLES: readonly UserRole[] = ["superadmin", "admin", "client"];

/**
 * Pure decision: should a request be redirected, and to where?
 * Returns a redirect path, or null to let the request through.
 */
export function evaluateDashboardAccess(
  pathname: string,
  hasSignedInCookie: boolean,
): string | null {
  if (!pathname.startsWith("/dashboard")) return null;
  return hasSignedInCookie ? null : "/auth/login";
}

/**
 * Pure decision with a server-decoded role (Slice B): when a role is known,
 * apply the ROLE_ROUTE_MATRIX — allowed routes pass, blocked routes land on
 * the role's landing route. Without a role, fall back to the signed-in
 * marker (authenticated-vs-not).
 */
export function evaluateDashboardAccessWithRole(
  pathname: string,
  role: UserRole | null,
  hasSignedInCookie: boolean,
): string | null {
  if (role) {
    if (isRouteAllowed(role, pathname)) return null;
    return getRoleLandingRoute(role);
  }
  return evaluateDashboardAccess(pathname, hasSignedInCookie);
}

/**
 * True when a 401 on the CURRENT page should hard-redirect to /auth/login.
 *
 * The proxy only guards /dashboard/*; every other route (/auth/login,
 * /auth/register, /inicio landing, demos, legal...) must render for
 * unauthenticated users. The AuthProvider silently probes /auth/me on every
 * mount (Slice B), so a 401 on a public page MUST NOT redirect — assigning
 * window.location.href to the page you are already on reloads it, and the
 * re-mount probes again → infinite reload loop.
 */
export function shouldRedirectOn401(pathname: string): boolean {
  return pathname.startsWith("/dashboard");
}

/** Client-side: mark the session as signed-in (non-sensitive boolean). */
export function setSignedInCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SIGNED_IN_COOKIE}=1; path=/; SameSite=Lax; max-age=2592000`;
}

/** Client-side: clear the signed-in marker (logout / 401). */
export function clearSignedInCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SIGNED_IN_COOKIE}=; path=/; SameSite=Lax; max-age=0`;
}

/**
 * Legacy keys written by the pre-Slice B auth flow (JWT + user profile in
 * localStorage). Slice B moved the session to the httpOnly cookie, so these
 * keys are never read — but old browsers still carry them from before the
 * deploy. Remove them once on boot so no stale token lingers in localStorage.
 */
export const LEGACY_AUTH_STORAGE_KEYS = ["nc_access_token", "nc_user"] as const;

/** Client-side: drop any legacy localStorage auth residue (one-time hygiene). */
export function clearLegacyAuthStorage(): void {
  if (typeof window === "undefined") return;
  try {
    for (const key of LEGACY_AUTH_STORAGE_KEYS) {
      if (window.localStorage.getItem(key) !== null) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Storage unavailable (private mode / blocked) — nothing to clean.
  }
}