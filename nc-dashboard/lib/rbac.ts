export type Role = "admin" | "basic" | "professional" | "enterprise";

export const ROLE_ROUTE_MATRIX: Record<Role, readonly string[]> = {
  admin: ["/dashboard"],
  basic: ["/dashboard"],
  professional: ["/dashboard"],
  enterprise: ["/dashboard"],
};

function normalizePath(pathname: string): string {
  if (!pathname) return "/";
  if (pathname === "/") return pathname;
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function isRouteAllowed(role: Role, pathname: string): boolean {
  const path = normalizePath(pathname);
  if (path === "/auth/login") return true;

  const allowed = ROLE_ROUTE_MATRIX[role] ?? [];
  return allowed.some((route) => {
    const normalizedRoute = normalizePath(route);
    return path === normalizedRoute || path.startsWith(`${normalizedRoute}/`);
  });
}

export function getRoleLandingRoute(role: Role): string {
  const allowed = ROLE_ROUTE_MATRIX[role] ?? [];
  return allowed[0] ?? "/dashboard";
}
