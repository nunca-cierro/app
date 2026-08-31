import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  evaluateDashboardAccess,
  SIGNED_IN_COOKIE,
} from "@/lib/route-guard";

/**
 * Server-side route guard (T4, owner decision #4).
 *
 * Next.js 16 renamed `middleware.ts` → `proxy.ts`; this file replaces the
 * client-side-only guard-window of layout.tsx with a server redirect for
 * UNAUTHENTICATED access to /dashboard/*.
 *
 * LIMITATION (factual): the backend stores the JWT in localStorage — no
 * httpOnly cookie exists until Slice B (auth-session-cookies). The proxy can
 * only distinguish signed-in vs not via the non-sensitive `nc_signed_in`
 * marker cookie set by the client after login/restore. ROLE checks (client
 * blocked from agents/platforms/admin even by direct URL) remain client-side
 * (layout effect) + the UI gates from T2/T3 until Slice B ships a
 * server-readable session cookie; at that point decode the JWT here and
 * apply ROLE_ROUTE_MATRIX from lib/rbac.ts.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const redirectTo = evaluateDashboardAccess(
    pathname,
    request.cookies.has(SIGNED_IN_COOKIE),
  );

  if (redirectTo) {
    const url = request.nextUrl.clone();
    url.pathname = redirectTo;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Only dashboard pages are guarded; /api/* keeps its own 401 handling
  // (apiClient redirects to login on 401) and /auth/* stays public.
  matcher: ["/dashboard/:path*"],
};