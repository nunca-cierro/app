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
  logout as apiLogout,
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
  logout: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Pure helpers (testable without rendering/browser)                 */
/* ------------------------------------------------------------------ */

/**
 * Normalize a profile fetched from `/auth/me` for storage as `AuthUser`.
 *
 * `/auth/me` returns the tenant plan as `current_plan`; the rest of the app
 * reads `user.plan` — map it so the dashboard/capabilities work after a
 * silent profile restore (e.g. page reload with a valid session cookie).
 */
export function restoreUserFromProfile(profile: AuthUser): AuthUser {
  return {
    ...profile,
    plan: profile.current_plan ?? profile.plan ?? null,
  };
}

/**
 * Pure logout flow (Slice B, AS-8/AS-9): call the logout API, clear the
 * proxy guard's signed-in marker, then redirect — even when the API call
 * fails (the session may already be dead, the redirect must still happen).
 */
export async function runLogoutFlow(
  apiLogout: () => Promise<unknown>,
  clearMarker: () => void,
  navigate: (url: string) => void,
): Promise<void> {
  try {
    await apiLogout();
  } catch {
    // Dead session — fall through to the redirect.
  }
  clearMarker();
  navigate("/auth/login");
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
  // Silent restore ALWAYS probes /auth/me with credentials (Slice B): the
  // httpOnly session cookie decides whether a session exists — there is no
  // client-readable token to check anymore.
  const [isLoading, setIsLoading] = useState(true);

  /* ── Mount: try silent session restore via the cookie ── */
  useEffect(() => {
    let cancelled = false;

    apiGetProfile()
      .then((profile) => {
        if (cancelled) return;
        // /auth/me returns the tenant plan as `current_plan` — map it onto
        // `plan` so the rest of the app (dashboard, sidebar, capabilities
        // fallback) reads the plan after silent profile restore.
        const restored = restoreUserFromProfile(profile);
        setUser(restored);
        // Re-arm the proxy guard's signed-in marker after a page reload.
        setSignedInCookie();
      })
      .catch(() => {
        if (cancelled) return;
        // No session — drop the marker (the proxy redirects the next
        // /dashboard navigation server-side) and stay logged out. No
        // localStorage cleanup (AS-9).
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

  /* ── Logout (async: clears the server session first, then redirects) ── */
  const logout = async () => {
    setUser(null);
    await runLogoutFlow(apiLogout, clearSignedInCookie, (url) => {
      if (typeof window !== "undefined") {
        window.location.href = url;
      }
    });
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