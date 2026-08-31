import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  evaluateDashboardAccessWithRole,
  SIGNED_IN_COOKIE,
  ACCESS_TOKEN_COOKIE,
  VALID_ROLES,
} from "@/lib/route-guard";
import type { UserRole } from "@/lib/types";

/**
 * Server-side route guard.
 *
 * Slice B (auth-session-cookies): the backend sets an httpOnly
 * `nc_access_token` JWT cookie. The proxy runs on the server, so it CAN read
 * the cookie from the request headers (cookies ride along on page
 * navigations automatically) and apply the ROLE_ROUTE_MATRIX from
 * lib/rbac.ts server-side — replacing the authenticated-vs-not limitation of
 * the T4 `nc_signed_in` marker.
 *
 * SECURITY NOTE: the JWT is decoded WITHOUT signature verification here. The
 * backend still enforces every authorization decision; the proxy only steers
 * redirects, so a forged role claim can at most change which page the client
 * is redirected to, never grant backend access.
 *
 * Fallback: when no session cookie exists, the proxy keeps the T4 behavior —
 * authenticated-vs-not via the `nc_signed_in` marker cookie.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSignedInCookie = request.cookies.has(SIGNED_IN_COOKIE);

  // Decode the session JWT's role claim (unverified — see SECURITY NOTE).
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  let role: UserRole | null = null;
  if (accessToken) {
    const payload = decodeJwtPayload(accessToken);
    const candidate = payload?.role;
    if (
      typeof candidate === "string" &&
      (VALID_ROLES as readonly string[]).includes(candidate)
    ) {
      role = candidate as UserRole;
    }
  }

  const redirectTo = evaluateDashboardAccessWithRole(
    pathname,
    role,
    hasSignedInCookie,
  );

  if (redirectTo) {
    const url = request.nextUrl.clone();
    url.pathname = redirectTo;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

/**
 * Decode a JWT payload WITHOUT verification (the backend is the authority).
 * Returns null for anything that is not a three-part base64url JWT.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    const json =
      typeof Buffer !== "undefined"
        ? Buffer.from(padded, "base64").toString("utf-8")
        : atob(padded);
    const parsed: unknown = JSON.parse(json);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export const config = {
  // Only dashboard pages are guarded; /api/* keeps its own 401 handling
  // (apiClient redirects to login on 401) and /auth/* stays public.
  matcher: ["/dashboard/:path*"],
};