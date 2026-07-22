import type { UserRole } from "@/lib/types";

/**
 * Route matrix for each role.
 * Entries without `/dashboard` prefix avoid acting as catch-all wildcards.
 * The `/dashboard` home is allowed for everyone via exact match in `isRouteAllowed`.
 */
export const ROLE_ROUTE_MATRIX: Record<UserRole, readonly string[]> = {
  superadmin: ["/dashboard", "/dashboard/admin", "/dashboard/tenants", "/dashboard/agents", "/dashboard/platforms", "/dashboard/conversations"],
  admin: ["/dashboard/tenants", "/dashboard/agents", "/dashboard/platforms", "/dashboard/conversations"],
  agent: ["/dashboard/conversations"],
  client: ["/dashboard/conversations"],
};

const ALL_ROLES: UserRole[] = ["superadmin", "admin", "agent", "client"];

function normalizePath(pathname: string): string {
  if (!pathname) return "/";
  if (pathname === "/") return pathname;
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function isRouteAllowed(
  role: UserRole,
  pathname: string,
  _tenant_id?: string | null,
): boolean {
  void _tenant_id; // reserved for tenant-scoped route filtering
  const path = normalizePath(pathname);
  if (path === "/auth/login") return true;

  // Dashboard home is allowed for every authenticated user
  if (path === "/dashboard") return true;

  const allowed = ROLE_ROUTE_MATRIX[role] ?? [];
  return allowed.some((route) => {
    const normalizedRoute = normalizePath(route);
    return path === normalizedRoute || path.startsWith(`${normalizedRoute}/`);
  });
}

export function isTenantless(user: {
  role?: string | null;
  current_role?: string | null;
  tenant_id?: string | null;
  current_tenant_id?: string | null;
}): boolean {
  // Superadmin oversees all tenants — never tenantless
  const effectiveRole = user.current_role ?? user.role;
  if (effectiveRole === "superadmin") return false;
  return !(user.tenant_id || user.current_tenant_id);
}

export function getAllowedRolesForPath(pathname: string): UserRole[] {
  const path = normalizePath(pathname);
  if (path === "/auth/login") return ALL_ROLES;
  if (path === "/dashboard") return ALL_ROLES;

  return ALL_ROLES.filter((role) => isRouteAllowed(role, path));
}

export function getRoleLandingRoute(role: UserRole): string {
  const allowed = ROLE_ROUTE_MATRIX[role] ?? [];
  return allowed.length > 0 ? allowed[0] : "/dashboard";
}
