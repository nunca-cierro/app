"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  login as apiLogin,
  register as apiRegister,
  getProfile as apiGetProfile,
  TOKEN_KEYS,
} from "@/lib/api";
import type { AuthUser } from "@/lib/types";

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
  const [isLoading, setIsLoading] = useState(true);

  /* ── Mount: try silent auth from stored token ── */
  useEffect(() => {
    const init = async () => {
      try {
        const accessToken = localStorage.getItem(TOKEN_KEYS.access);
        if (!accessToken) {
          setIsLoading(false);
          return;
        }

        // Verify token is still valid by fetching profile
        const profile = await apiGetProfile();
        setUser(profile);
        localStorage.setItem(TOKEN_KEYS.user, JSON.stringify(profile));
      } catch {
        // Token invalid — clear everything
        localStorage.removeItem(TOKEN_KEYS.access);
        localStorage.removeItem(TOKEN_KEYS.user);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  /* ── Login ── */
  const login = useCallback(async (_email: string, _password: string) => {
    const data = await apiLogin(_email, _password);
    setUser({ id: data.user_id, email: data.email, name: data.name });
  }, []);

  /* ── Register ── */
  const register = useCallback(
    async (_email: string, _password: string, _name: string) => {
      const data = await apiRegister(_email, _password, _name);
      setUser({ id: data.user_id, email: data.email, name: data.name });
    },
    [],
  );

  /* ── Logout ── */
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEYS.access);
    localStorage.removeItem(TOKEN_KEYS.user);
    setUser(null);
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login";
    }
  }, []);

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
