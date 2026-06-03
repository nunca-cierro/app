"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";
import {
  LayoutDashboard,
  Building2,
  Bot,
  Phone,
  MessageSquare,
  LogOut,
  Send,
  ChevronDown,
  ChevronRight,
  Users,
  Shield,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
  /** If set, only users with one of these roles see this nav item. */
  roles?: UserRole[];
}

/* ------------------------------------------------------------------ */
/*  Pure: getNavItems(role) — testable without React                   */
/* ------------------------------------------------------------------ */

const CLIENT_ROUTES: UserRole[] = ["client", "agent"];
const ADMIN_ROUTES: UserRole[] = ["superadmin", "admin", "agent", "client"];
const SUPERADMIN_ROUTES: UserRole[] = ["superadmin", "admin"];

export function getNavItems(role?: UserRole | null): NavItem[] {
  const isClientOrAgent = role && CLIENT_ROUTES.includes(role);
  const isSuperOrAdmin = role && SUPERADMIN_ROUTES.includes(role);

  const items: NavItem[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ADMIN_ROUTES,
    },
  ];

  // Negocios: only superadmin/admin
  if (isSuperOrAdmin) {
    items.push({
      href: "/dashboard/tenants",
      label: "Negocios",
      icon: Building2,
      roles: SUPERADMIN_ROUTES,
    });
  }

  // Admin: solo superadmin
  if (role === "superadmin") {
    items.push({
      href: "/dashboard/admin",
      label: "Admin",
      icon: Shield,
      roles: ["superadmin"],
      children: [
        { href: "/dashboard/admin/users", label: "Usuarios", icon: Users, roles: ["superadmin"] },
      ],
    });
  }

  // Agentes y Plataformas: hidden for client/agent
  if (!isClientOrAgent) {
    items.push({
      href: "/dashboard/agents",
      label: "Agentes",
      icon: Bot,
      roles: SUPERADMIN_ROUTES,
    });

    items.push({
      href: "/dashboard/platforms",
      label: "Plataformas",
      icon: LayoutDashboard,
      roles: SUPERADMIN_ROUTES,
      children: [
        { href: "/dashboard/platforms/evolution", label: "WhatsApp (Evo)", icon: Phone, roles: SUPERADMIN_ROUTES },
        { href: "/dashboard/platforms/whatsapp", label: "WhatsApp (Meta)", icon: Phone, roles: SUPERADMIN_ROUTES },
        { href: "/dashboard/platforms/telegram", label: "Telegram", icon: Send, roles: SUPERADMIN_ROUTES },
      ],
    });
  }

  // Conversaciones: visible for all roles
  items.push({
    href: "/dashboard/conversations",
    label: "Conversaciones",
    icon: MessageSquare,
    roles: ADMIN_ROUTES,
  });

  return items;
}

/* ------------------------------------------------------------------ */
/*  Sidebar component                                                   */
/* ------------------------------------------------------------------ */

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const effectiveRole = user?.current_role ?? user?.role ?? null;
  const navItems = getNavItems(effectiveRole);

  return (
    <aside className="flex h-full w-56 flex-col border-r bg-background">
      {/* ── Logo ── */}
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-lg font-bold tracking-tight">
          NuncaCierro
        </span>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          if (item.children) {
            return (
              <CollapsibleSection
                key={item.label}
                item={item}
                pathname={pathname}
              />
            );
          }

          return <NavLink key={item.href} item={item} pathname={pathname} />;
        })}
      </nav>

      {/* ── User + Logout ── */}
      <div className="border-t p-3">
        <div className="mb-2 truncate px-3 text-xs text-muted-foreground">
          {user?.name ?? user?.email}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="w-full justify-start gap-3"
        >
          <LogOut className="size-4" />
          Cerrar Sesión
        </Button>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  NavLink                                                             */
/* ------------------------------------------------------------------ */

function NavLink({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const Icon = item.icon;
  const isActive =
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {item.label}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  CollapsibleSection                                                  */
/* ------------------------------------------------------------------ */

function CollapsibleSection({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const [open, setOpen] = useState(true);
  const Icon = item.icon;
  const isActive = item.children?.some((child) =>
    pathname.startsWith(child.href),
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        {open ? (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground/60" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
        )}
      </button>

      {open && (
        <div className="ml-2 mt-1 space-y-0.5 border-l pl-2">
          {item.children?.map((child) => {
            const ChildIcon = child.icon;
            const isChildActive = pathname.startsWith(child.href);

            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  isChildActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <ChildIcon className="size-4 shrink-0" />
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
