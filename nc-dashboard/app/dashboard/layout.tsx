"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { isRouteAllowed, getRoleLandingRoute, isTenantless } from "@/lib/rbac";
import type { UserRole } from "@/lib/types";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  /* ── Auth guard: redirect to login if not authenticated ── */
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isLoading, isAuthenticated, router]);

  /* ── Tenantless guard: redirect to onboarding ── */
  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;

    if (isTenantless(user) && pathname !== "/dashboard/onboarding") {
      router.replace("/dashboard/onboarding");
    }
  }, [isLoading, isAuthenticated, user, pathname, router]);

  /* ── Role guard: redirect to landing route if not allowed ── */
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    const effectiveRole: UserRole | undefined = user?.current_role ?? user?.role;
    if (!effectiveRole) return;

    if (!isRouteAllowed(effectiveRole, pathname, user?.tenant_id)) {
      router.replace(getRoleLandingRoute(effectiveRole));
    }
  }, [isLoading, isAuthenticated, user, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Sidebar ── */}
      <Sidebar />

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto px-6 py-6">{children}</main>
    </div>
  );
}
