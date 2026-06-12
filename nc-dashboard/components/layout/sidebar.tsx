"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { apiClient, ApiError } from "@/lib/api";
import type { UserRole, TenantEntry } from "@/lib/types";
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
  ChevronsUpDown,
  Users,
  Shield,
  KeyRound,
  Loader2 as LoaderIcon,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";

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

export function getNavItems(role?: UserRole | null, plan?: string | null): NavItem[] {
  const isClientOrAgent = role && CLIENT_ROUTES.includes(role);

  const items: NavItem[] = [];

  // ── Sección: General ──
  items.push({
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ADMIN_ROUTES,
  });

  // Clients with Basic plan: no dashboard access
  if (role === "client" && plan === "basic") {
    return []; // No navigation items — access denied
  }

  // ── Sección: Gestión (solo superadmin/admin) ──
  if (!isClientOrAgent) {
    // Negocios
    items.push({
      href: "/dashboard/tenants",
      label: "Negocios",
      icon: Building2,
      roles: ["superadmin", "admin"],
    });

    // Agentes IA
    items.push({
      href: "/dashboard/agents",
      label: "Agentes",
      icon: Bot,
      roles: ["superadmin", "admin"],
    });

    // Conexiones (plataformas)
    items.push({
      href: "/dashboard/platforms",
      label: "Conexiones",
      icon: Phone,
      roles: ["superadmin", "admin"],
      children: [
        { href: "/dashboard/platforms/evolution", label: "WhatsApp", icon: Phone, roles: ["superadmin", "admin"] },
        { href: "/dashboard/platforms/whatsapp", label: "Meta API", icon: Phone, roles: ["superadmin"] },
        { href: "/dashboard/platforms/telegram", label: "Telegram", icon: Send, roles: ["superadmin"] },
      ],
    });
  }

  // ── Sección: Comunicación ──
  items.push({
    href: "/dashboard/conversations",
    label: "Conversaciones",
    icon: MessageSquare,
    roles: ADMIN_ROUTES,
  });

  // ── Sección: Admin (solo superadmin) ──
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

  return items.map((item) => {
    if (item.children) {
      return {
        ...item,
        children: item.children.filter((child) => !child.roles || (role != null && child.roles.includes(role))),
      };
    }
    return item;
  });
}

/* ------------------------------------------------------------------ */
/*  Sidebar component                                                   */
/* ------------------------------------------------------------------ */

export function Sidebar() {
  const pathname = usePathname();
  const { user, switchTenant, logout } = useAuth();
  const effectiveRole = user?.current_role ?? user?.role ?? null;
  const plan = user?.plan ?? null;
  const navItems = getNavItems(effectiveRole, plan);

  /* ── Change password state ── */
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas nuevas no coinciden");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }
    setIsChangingPassword(true);
    try {
      await apiClient("/api/v1/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      toast.success("Contraseña actualizada correctamente");
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Error al cambiar contraseña";
      toast.error(msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

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

      {/* ── Tenant Switcher ── */}
      <TenantSwitcher
        currentTenantId={user?.tenant_id ?? user?.current_tenant_id ?? null}
        onSwitch={switchTenant}
      />

      {/* ── User + Logout ── */}
      <div className="border-t p-3">
        <div className="mb-2 truncate px-3 text-xs text-muted-foreground">
          {user?.name ?? user?.email}
        </div>

        {/* ── Change Password ── */}
        {!showPasswordForm ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPasswordForm(true)}
            className="mb-1 w-full justify-start gap-3"
          >
            <KeyRound className="size-4" />
            Cambiar Contraseña
          </Button>
        ) : (
          <div className="mb-2 space-y-2 rounded-md border p-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Nueva contraseña</span>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <Input
              type="password"
              placeholder="Contraseña actual"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="h-8 text-xs"
            />
            <Input
              type="password"
              placeholder="Nueva contraseña"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-8 text-xs"
            />
            <Input
              type="password"
              placeholder="Confirmar nueva"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-8 text-xs"
            />
            <Button
              size="sm"
              onClick={handleChangePassword}
              disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="w-full text-xs"
            >
              {isChangingPassword ? (
                <LoaderIcon className="mr-1 size-3 animate-spin" />
              ) : null}
              Guardar
            </Button>
          </div>
        )}

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


/* ------------------------------------------------------------------ */
/*  TenantSwitcher                                                     */
/* ------------------------------------------------------------------ */

function TenantSwitcher({
  currentTenantId,
  onSwitch,
}: {
  currentTenantId: string | null;
  onSwitch: (tenantId: string) => Promise<void>;
}) {
  const [tenants, setTenants] = useState<TenantEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  /* ── Fetch user's tenants on mount ── */
  useEffect(() => {
    let cancelled = false;
    apiClient<TenantEntry[]>("/api/v1/tenants")
      .then((data) => {
        if (!cancelled) setTenants(data);
      })
      .catch(() => {
        // Silently fail — tenant switcher simply won't show
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Only render if the user has 2+ tenants ── */
  if (tenants.length < 2) return null;

  const currentTenant = tenants.find((t) => t.id === currentTenantId);

  const handleSwitch = async (tenantId: string) => {
    if (tenantId === currentTenantId) return;
    setIsSwitching(true);
    setOpen(false);
    try {
      await onSwitch(tenantId);
      toast.success("Negocio cambiado");
    } catch {
      toast.error("Error al cambiar de negocio");
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className="border-t px-3 py-2">
      <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        Negocio activo
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          disabled={isSwitching}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            "disabled:opacity-50",
          )}
        >
          <Building2 className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-left">
            {currentTenant?.name ?? "Seleccionar..."}
          </span>
          {isSwitching ? (
            <LoaderIcon className="size-3.5 animate-spin" />
          ) : (
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground/60" />
          )}
        </button>

        {open && (
          <div className="absolute bottom-full left-0 right-0 mb-1 rounded-md border bg-popover shadow-md">
            <div className="py-1">
              {tenants.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSwitch(t.id)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    t.id === currentTenantId
                      ? "bg-accent/50 font-medium text-accent-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <span className="flex-1 truncate">{t.name}</span>
                  {t.id === currentTenantId && (
                    <Check className="size-3.5 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
