/**
 * Server/client-shared route guard used by the Next.js proxy (proxy.ts).
 *
 * LIMITATION (documented, T4): the backend stores the JWT in localStorage
 * only — no httpOnly cookie exists until Slice B (auth-session-cookies)
 * lands. The proxy therefore CANNOT read the role server-side; it only
 * enforces authenticated-vs-not via a lightweight non-sensitive marker
 * cookie (`nc_signed_in`) that the client sets after a successful
 * login/register/switch-tenant/silent-restore and clears on logout/401.
 * Role gating stays client-side (layout effect) + the UI gates from T2/T3.
 * When Slice B ships real cookies, decode the JWT here and apply the
 * ROLE_ROUTE_MATRIX from lib/rbac.ts server-side.
 */

export const SIGNED_IN_COOKIE = "nc_signed_in";

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