"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import {
  login as apiLogin,
  register as apiRegister,
  switchTenant as apiSwitchTenant,
  getProfile as apiGetProfile,
  TOKEN_KEYS,
} from "@/lib/api";
import {
  clearSignedInCookie,
  setSignedInCookie,
} from "@/lib/route-guard";
import type { AuthUser } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role?: string) => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  logout: () => void;
}

/* ------------------------------------------------------------------ */
/*  Pure: silent profile restore mapping (testable without rendering)  */
/* ------------------------------------------------------------------ */

/**
 * Normalize a profile fetched from `/auth/me` for storage as `AuthUser`.
 *
 * `/auth/me` returns the tenant plan as `current_plan`; the rest of the app
 * reads `user.plan` — map it so the dashboard/capabilities work after a
 * silent profile restore (e.g. page reload with a stored token).
 */
export function restoreUserFromProfile(profile: AuthUser): AuthUser {
  return {
    ...profile,
    plan: profile.current_plan ?? profile.plan ?? null,
  };
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    return !!localStorage.getItem(TOKEN_KEYS.access);
  });

  /* ── Mount: try silent auth from stored token ── */
  useEffect(() => {
    let cancelled = false;
    const accessToken = localStorage.getItem(TOKEN_KEYS.access);
    if (!accessToken) {
      return () => {
        cancelled = true;
      };
    }

    // Verify token is still valid by fetching profile
    apiGetProfile()
      .then((profile) => {
        if (cancelled) return;
        // /auth/me returns the tenant plan as `current_plan` — map it onto
        // `plan` so the rest of the app (dashboard, sidebar, capabilities
        // fallback) reads the plan after silent profile restore.
        const restored = restoreUserFromProfile(profile);
        setUser(restored);
        localStorage.setItem(TOKEN_KEYS.user, JSON.stringify(restored));
        // Re-arm the proxy guard's signed-in marker after a page reload.
        setSignedInCookie();
      })
      .catch(() => {
        if (cancelled) return;
        // Token invalid — clear everything
        localStorage.removeItem(TOKEN_KEYS.access);
        localStorage.removeItem(TOKEN_KEYS.user);
        clearSignedInCookie();
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Login ── */
  const login = async (_email: string, _password: string) => {
    const data = await apiLogin(_email, _password);
    setUser({
      id: data.user_id,
      email: data.email,
      name: data.name,
      role: data.role,
      tenant_id: data.tenant_id,
      plan: data.tenant_plan ?? null,
      payment_status: data.payment_status ?? null,
      capabilities: data.capabilities ?? null,
    });
  };

  /* ── Register ── */
  const register = async (_email: string, _password: string, _name: string, _role: string = "client") => {
    const data = await apiRegister(_email, _password, _name, _role);
    setUser({
      id: data.user_id,
      email: data.email,
      name: data.name,
      role: data.role,
      tenant_id: data.tenant_id,
      plan: data.tenant_plan ?? null,
      payment_status: data.payment_status ?? null,
      capabilities: data.capabilities ?? null,
    });
  };

  /* ── Switch Tenant ── */
  const switchTenant = async (tenantId: string) => {
    const data = await apiSwitchTenant(tenantId);
    setUser({
      id: data.user_id,
      email: data.email,
      name: data.name,
      role: data.role,
      tenant_id: data.tenant_id,
      plan: data.tenant_plan ?? null,
      payment_status: data.payment_status ?? null,
      capabilities: data.capabilities ?? null,
    });
  };

  /* ── Logout ── */
  const logout = () => {
    localStorage.removeItem(TOKEN_KEYS.access);
    localStorage.removeItem(TOKEN_KEYS.user);
    clearSignedInCookie();
    setUser(null);
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        switchTenant,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
