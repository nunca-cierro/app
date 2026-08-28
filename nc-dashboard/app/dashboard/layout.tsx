"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { isRouteAllowed, getRoleLandingRoute } from "@/lib/rbac";
import type { UserRole } from "@/lib/types";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [previousPath, setPreviousPath] = useState(pathname);

  /* ── Close the mobile drawer on navigation ── */
  useEffect(() => {
    if (pathname !== previousPath) {
      setPreviousPath(pathname);
      setMobileOpen(false);
    }
  }, [pathname, previousPath]);

  /* ── Lock body scroll while the mobile drawer is open ── */
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  /* ── Auth guard: redirect to login if not authenticated ── */
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isLoading, isAuthenticated, router]);

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
      {/* ── Mobile top bar ── */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur lg:hidden">
        <span className="text-base font-bold tracking-tight">NuncaCierro</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú de navegación"
        >
          <Menu className="size-5" />
        </Button>
      </header>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-sidebar shadow-2xl">
            <Sidebar
              onNavigate={() => setMobileOpen(false)}
              headerAction={
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Cerrar menú de navegación"
                >
                  <X className="size-5" />
                </Button>
              }
            />
          </div>
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      <div className="sticky top-0 hidden h-screen shrink-0 lg:block">
        <Sidebar />
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto px-4 py-6 pt-20 lg:px-8 lg:pt-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
