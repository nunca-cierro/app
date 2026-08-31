"use client";

/* ------------------------------------------------------------------ */
/*  Backend API client — talks to FastAPI via Next.js rewrites         */
/*                                                                     */
/*  All /api/:path* calls are rewritten to http://localhost:8000/api/  */
/*  via next.config.ts rewrites.                                       */
/*                                                                     */
/*  Transport (Slice B, spec AS-6): the JWT lives in the httpOnly      */
/*  `nc_access_token` cookie, so every fetch uses credentials:"include" */
/*  — no Authorization header is ever built and localStorage is never   */
/*  read or written. State-changing requests (POST/PUT/PATCH/DELETE)    */
/*  echo the non-httpOnly `nc_csrf` cookie back in X-CSRF-Token.       */
/* ------------------------------------------------------------------ */

import type { AuthUser, LoginResponse, Tenant } from "@/lib/types";
import {
  clearSignedInCookie,
  setSignedInCookie,
} from "@/lib/route-guard";
import { friendlyErrorMessage } from "@/lib/api-errors";

const CSRF_COOKIE = "nc_csrf";
const CSRF_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Read the CSRF double-submit token from the non-httpOnly `nc_csrf` cookie
 * (set by login/register/switch-tenant). Returns null when absent or when
 * running server-side (no document).
 */
export function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const row = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${CSRF_COOKIE}=`));
  return row ? decodeURIComponent(row.slice(CSRF_COOKIE.length + 1)) : null;
}

/* ------------------------------------------------------------------ */
/*  Auth endpoints (no auth header needed — cookies carry the session) */
/* ------------------------------------------------------------------ */

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response = await fetch("/api/v1/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(
      response.status,
      friendlyErrorMessage(response.status, text),
    );
  }

  const data: LoginResponse = await response.json();
  // Server-readable signed-in marker for the proxy guard (T4) — the JWT
  // itself lives in the httpOnly cookie set by the response (AS-1).
  setSignedInCookie();
  return data;
}

export async function register(
  email: string,
  password: string,
  name: string,
  role: string = "client",
): Promise<LoginResponse> {
  const response = await fetch("/api/v1/auth/register", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name, role }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(
      response.status,
      friendlyErrorMessage(response.status, text),
    );
  }

  const data: LoginResponse = await response.json();
  // Server-readable signed-in marker for the proxy guard (T4).
  setSignedInCookie();
  return data;
}

export async function switchTenant(tenantId: string): Promise<LoginResponse> {
  const response = await fetch("/api/v1/auth/switch-tenant", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenant_id: tenantId }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(
      response.status,
      friendlyErrorMessage(response.status, text),
    );
  }

  const data: LoginResponse = await response.json();
  // Server-readable signed-in marker for the proxy guard (T4).
  setSignedInCookie();
  return data;
}

export async function getProfile(): Promise<AuthUser> {
  return apiClient<AuthUser>("/api/v1/auth/me");
}

/** End the session: the backend expires both cookies (AS-8). */
export async function logout(): Promise<void> {
  await apiClient<{ status: string }>("/api/v1/auth/logout", {
    method: "POST",
  });
}

/* ------------------------------------------------------------------ */
/*  Tenant endpoints                                                    */
/* ------------------------------------------------------------------ */

export async function updatePaymentStatus(
  tenantId: string,
  status: "active" | "inactive",
): Promise<Tenant> {
  return apiClient<Tenant>(`/api/v1/tenants/${tenantId}/payment-status`, {
    method: "PATCH",
    body: JSON.stringify({ payment_status: status }),
  });
}

/* ------------------------------------------------------------------ */
/*  Authenticated fetch wrapper                                       */
/* ------------------------------------------------------------------ */

export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // CSRF double-submit: mutations echo the nc_csrf cookie (AS-5). Reads
  // never send it, so silent restore / SSE GETs are unaffected.
  if (CSRF_METHODS.has(method)) {
    const csrf = getCsrfToken();
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: "include",
  }).catch((err) => {
    throw new ApiError(0, `Network error: ${err instanceof Error ? err.message : "server unreachable"}`);
  });

  if (response.status === 401) {
    // Session expired — redirect to login. The proxy guard marker must go
    // (next /dashboard navigation redirects server-side); localStorage
    // holds nothing to clean anymore (AS-9).
    clearSignedInCookie();
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login";
    }
    throw new ApiError(401, "Unauthorized");
  }

  if (!response.ok) {
    const text = await response.text();
    // T6 — never leak raw backend JSON to users; keep it in the console for
    // debugging instead.
    console.error(
      `[apiClient] ${response.status} ${endpoint} — raw response:`,
      text,
    );
    throw new ApiError(
      response.status,
      friendlyErrorMessage(response.status, text),
    );
  }

  return response.status === 204 ? (undefined as T) : response.json();
}