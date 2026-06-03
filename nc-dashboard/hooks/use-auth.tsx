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
  getProfile as apiGetProfile,
  TOKEN_KEYS,
} from "@/lib/api";
import type { AuthUser, UserRole } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
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
        setUser(profile);
        localStorage.setItem(TOKEN_KEYS.user, JSON.stringify(profile));
      })
      .catch(() => {
        if (cancelled) return;
        // Token invalid — clear everything
        localStorage.removeItem(TOKEN_KEYS.access);
        localStorage.removeItem(TOKEN_KEYS.user);
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
    });
  };

  /* ── Register ── */
  const register = async (_email: string, _password: string, _name: string) => {
    const data = await apiRegister(_email, _password, _name);
    setUser({
      id: data.user_id,
      email: data.email,
      name: data.name,
      role: data.role,
      tenant_id: data.tenant_id,
    });
  };

  /* ── Logout ── */
  const logout = () => {
    localStorage.removeItem(TOKEN_KEYS.access);
    localStorage.removeItem(TOKEN_KEYS.user);
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
