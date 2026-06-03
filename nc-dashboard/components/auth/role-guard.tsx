"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { UserRole } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  RoleGuard — wraps pages to restrict access by user role            */
/* ------------------------------------------------------------------ */

interface RoleGuardProps {
  /** Roles allowed to view this page. */
  allowedRoles: UserRole[];
  /** Optional fallback route (default: /dashboard). */
  fallback?: string;
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, fallback = "/dashboard", children }: RoleGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    const effectiveRole = user?.current_role ?? user?.role;
    if (effectiveRole && !allowedRoles.includes(effectiveRole)) {
      router.replace(fallback);
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, fallback, router, pathname]);

  // Show nothing while checking — avoid flash of unauthorized content
  if (isLoading) return null;

  const effectiveRole = user?.current_role ?? user?.role;
  if (!effectiveRole || !allowedRoles.includes(effectiveRole)) return null;

  return <>{children}</>;
}
