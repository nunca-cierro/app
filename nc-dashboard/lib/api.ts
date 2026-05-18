"use client";

/* ------------------------------------------------------------------ */
/*  Backend API client — talks to FastAPI via Next.js rewrites         */
/*                                                                     */
/*  All /api/:path* calls are rewritten to http://localhost:8000/api/  */
/*  via next.config.ts rewrites.                                       */
/* ------------------------------------------------------------------ */

import type { AuthUser, LoginResponse } from "@/lib/types";

export const TOKEN_KEYS = {
  access: "nc_access_token",
  user: "nc_user",
} as const;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/* ------------------------------------------------------------------ */
/*  Auth endpoints (no auth header needed)                             */
/* ------------------------------------------------------------------ */

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response = await fetch("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(response.status, text);
  }

  const data: LoginResponse = await response.json();
  localStorage.setItem(TOKEN_KEYS.access, data.access_token);
  localStorage.setItem(
    TOKEN_KEYS.user,
    JSON.stringify({ id: data.user_id, email: data.email, name: data.name }),
  );
  return data;
}

export async function register(
  email: string,
  password: string,
  name: string,
): Promise<LoginResponse> {
  const response = await fetch("/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(response.status, text);
  }

  const data: LoginResponse = await response.json();
  localStorage.setItem(TOKEN_KEYS.access, data.access_token);
  localStorage.setItem(
    TOKEN_KEYS.user,
    JSON.stringify({ id: data.user_id, email: data.email, name: data.name }),
  );
  return data;
}

export async function getProfile(): Promise<AuthUser> {
  return apiClient<AuthUser>("/api/v1/auth/me");
}

/* ------------------------------------------------------------------ */
/*  Authenticated fetch wrapper                                       */
/* ------------------------------------------------------------------ */

export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const accessToken = localStorage.getItem(TOKEN_KEYS.access);
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(endpoint, { ...options, headers });

  if (response.status === 401) {
    // Token expired or invalid — clear and redirect
    localStorage.removeItem(TOKEN_KEYS.access);
    localStorage.removeItem(TOKEN_KEYS.user);
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login";
    }
    throw new ApiError(401, "Unauthorized");
  }

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(response.status, text);
  }

  return response.status === 204 ? (undefined as T) : response.json();
}
