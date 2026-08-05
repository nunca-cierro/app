"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
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
  Moon,
  Sun,
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

export interface NavSection {
  label: string;
  items: NavItem[];
}

/* ------------------------------------------------------------------ */
/*  Pure: getNavSections(role) + getNavItems(role) — testable          */
/* ------------------------------------------------------------------ */

const CLIENT_ROUTES: UserRole[] = ["client", "agent"];
const ADMIN_ROUTES: UserRole[] = ["superadmin", "admin", "agent", "client"];

function filterChildren(item: NavItem, role?: UserRole | null): NavItem {
  if (!item.children) return item;
  return {
    ...item,
    children: item.children.filter(
      (child) => !child.roles || (role != null && child.roles.includes(role)),
    ),
  };
}

export function getNavSections(
  role?: UserRole | null,
  plan?: string | null,
): NavSection[] {
  void plan; // plan controls actions (capabilities), never navigation
  const isClientOrAgent = role && CLIENT_ROUTES.includes(role);

  const sections: NavSection[] = [];

  // ── General ──
  sections.push({
    label: "General",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        roles: ADMIN_ROUTES,
      },
    ],
  });

  // ── Gestión (solo superadmin/admin) ──
  if (!isClientOrAgent) {
    sections.push({
      label: "Gestión",
      items: [
        {
          href: "/dashboard/tenants",
          label: "Negocios",
          icon: Building2,
          roles: ["superadmin", "admin"],
        },
        {
          href: "/dashboard/agents",
          label: "Agentes",
          icon: Bot,
          roles: ["superadmin", "admin"],
        },
        {
          href: "/dashboard/platforms",
          label: "Conexiones",
          icon: Phone,
          roles: ["superadmin", "admin"],
          children: [
            { href: "/dashboard/platforms/evolution", label: "WhatsApp", icon: Phone, roles: ["superadmin", "admin"] },
            { href: "/dashboard/platforms/whatsapp", label: "Meta API", icon: Phone, roles: ["superadmin"] },
            { href: "/dashboard/platforms/telegram", label: "Telegram", icon: Send, roles: ["superadmin"] },
          ],
        },
      ],
    });
  }

  // ── Comunicación ──
  sections.push({
    label: "Comunicación",
    items: [
      {
        href: "/dashboard/conversations",
        label: "Conversaciones",
        icon: MessageSquare,
        roles: ADMIN_ROUTES,
      },
    ],
  });

  // ── Administración (solo superadmin) ──
  if (role === "superadmin") {
    sections.push({
      label: "Administración",
      items: [
        {
          href: "/dashboard/admin",
          label: "Admin",
          icon: Shield,
          roles: ["superadmin"],
          children: [
            { href: "/dashboard/admin/users", label: "Usuarios", icon: Users, roles: ["superadmin"] },
          ],
        },
      ],
    });
  }

  return sections.map((section) => ({
    ...section,
    items: section.items
      .filter(
        (item) => !item.roles || (role != null && item.roles.includes(role)),
      )
      .map((item) => filterChildren(item, role)),
  }));
}

export function getNavItems(role?: UserRole | null, plan?: string | null): NavItem[] {
  return getNavSections(role, plan).flatMap((section) => section.items);
}

/* ------------------------------------------------------------------ */
/*  Sidebar component                                                   */
/* ------------------------------------------------------------------ */

export function Sidebar({
  onNavigate,
  headerAction,
}: {
  /** Called after navigating to a route (used to close the mobile drawer). */
  onNavigate?: () => void;
  /** Optional action rendered at the right of the logo row (mobile close button). */
  headerAction?: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, switchTenant, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const effectiveRole = user?.current_role ?? user?.role ?? null;
  const plan = user?.plan ?? null;
  const navSections = getNavSections(effectiveRole, plan);

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

  const initials = (user?.name ?? user?.email ?? "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-sidebar text-sidebar-foreground">
      {/* ── Logo ── */}
      <div className="flex h-14 items-center gap-2.5 border-b px-4">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
          NC
        </span>
        <span className="flex-1 text-base font-bold tracking-tight">
          NuncaCierro
        </span>
        {headerAction}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navSections.map((section) => (
          <div key={section.label}>
            <div className="px-3 pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) =>
                item.children ? (
                  <CollapsibleSection
                    key={item.label}
                    item={item}
                    pathname={pathname}
                    onNavigate={onNavigate}
                  />
                ) : (
                  <NavLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    onNavigate={onNavigate}
                  />
                ),
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Tenant Switcher ── */}
      <TenantSwitcher
        currentTenantId={user?.tenant_id ?? user?.current_tenant_id ?? null}
        onSwitch={switchTenant}
        onSelect={onNavigate}
      />

      {/* ── User + Logout ── */}
      <div className="border-t p-3">
        <div className="mb-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials}
          </div>
          <div className="min-w-0 flex-1 truncate text-xs font-medium text-sidebar-foreground/80">
            {user?.name ?? user?.email}
          </div>
        </div>

        {/* ── Theme Toggle ── */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="mb-1 w-full justify-start gap-3"
          aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        >
          {theme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
          {theme === "dark" ? "Modo Claro" : "Modo Oscuro"}
        </Button>

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
          <div className="mb-2 space-y-2 rounded-md border bg-background p-2">
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
          className="w-full justify-start gap-3 text-destructive hover:text-destructive"
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
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const isActive =
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-sidebar-foreground/70 hover:bg-accent/60 hover:text-accent-foreground",
      )}
    >
      {isActive ? (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary"
        />
      ) : null}
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
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
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
        aria-expanded={open}
        className={cn(
          "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-sidebar-foreground/70 hover:bg-accent/60 hover:text-accent-foreground",
        )}
      >
        {isActive ? (
          <span
            aria-hidden="true"
            className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary"
          />
        ) : null}
        <Icon className="size-4 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        {open ? (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground/60" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
        )}
      </button>

      {open && (
        <div className="ml-3 mt-1 space-y-0.5 border-l border-sidebar-border pl-2">
          {item.children?.map((child) => {
            const ChildIcon = child.icon;
            const isChildActive = pathname.startsWith(child.href);

            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                aria-current={isChildActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150",
                  isChildActive
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground/70 hover:bg-accent/60 hover:text-accent-foreground",
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
  onSelect,
}: {
  currentTenantId: string | null;
  onSwitch: (tenantId: string) => Promise<void>;
  onSelect?: () => void;
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
      onSelect?.();
    } catch {
      toast.error("Error al cambiar de negocio");
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className="border-t px-3 py-2">
      <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
        Negocio activo
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          disabled={isSwitching}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
            "hover:bg-accent/60 hover:text-accent-foreground",
            "disabled:opacity-50",
          )}
        >
          <Building2 className="size-4 shrink-0 text-sidebar-foreground/60" />
          <span className="flex-1 truncate text-left">
            {currentTenant?.name ?? "Seleccionar..."}
          </span>
          {isSwitching ? (
            <LoaderIcon className="size-3.5 animate-spin" />
          ) : (
            <ChevronsUpDown className="size-3.5 shrink-0 text-sidebar-foreground/40" />
          )}
        </button>

        {open && (
          <div className="absolute bottom-full left-0 right-0 mb-1 rounded-md border bg-popover text-popover-foreground shadow-lg">
            <div className="py-1">
              {tenants.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSwitch(t.id)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors duration-150",
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
