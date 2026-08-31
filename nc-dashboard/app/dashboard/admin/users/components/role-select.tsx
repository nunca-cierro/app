"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { AdminUser, AuthUser, UserRole } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Role domain helpers (pure — testable without rendering)            */
/* ------------------------------------------------------------------ */

/** All roles offered by the role-edit select. Superadmin promotion is an equal-privilege edit. */
export const ROLE_OPTIONS: ReadonlyArray<{ value: UserRole; label: string }> = [
  { value: "client", label: "Cliente" },
  { value: "admin", label: "Admin" },
  { value: "superadmin", label: "Superadmin" },
];

/**
 * Roles offered by the tenant-assign form. `superadmin` is excluded: that
 * grant only happens through the superadmin-only user-creation endpoint
 * (PATCH-assign would 422 it).
 */
export const ASSIGNABLE_ROLE_OPTIONS: ReadonlyArray<{
  value: UserRole;
  label: string;
}> = ROLE_OPTIONS.filter((option) => option.value !== "superadmin");

/**
 * Pure gate: a viewer may edit a user's role only if the viewer's effective
 * role (`current_role ?? role`) is superadmin AND the target is not themselves.
 */
export function canEditUserRole(
  viewer: Pick<AuthUser, "id" | "role" | "current_role"> | null | undefined,
  targetUserId: string,
): boolean {
  const effectiveRole = viewer?.current_role ?? viewer?.role;
  return effectiveRole === "superadmin" && viewer?.id !== targetUserId;
}

/* ------------------------------------------------------------------ */
/*  RoleSelect — self-hiding inline role editor                        */
/* ------------------------------------------------------------------ */

interface RoleSelectProps {
  user: AdminUser;
  /** Called with the newly selected role; the page owns the PATCH + toasts. */
  onRoleChange: (role: UserRole) => Promise<void>;
}

/**
 * Inline per-row role editor (PaymentStatusToggle pattern): renders nothing
 * unless the viewer is a superadmin editing another user — for anyone else
 * the select simply does not exist in the DOM.
 */
export function RoleSelect({ user, onRoleChange }: RoleSelectProps) {
  const { user: authUser } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  if (!canEditUserRole(authUser, user.id)) {
    return null;
  }

  async function handleChange(nextRole: string) {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onRoleChange(nextRole as UserRole);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <select
      aria-label={`Cambiar rol de ${user.email}`}
      value={user.role}
      disabled={isSaving}
      onChange={(e) => handleChange(e.target.value)}
      className="h-8 rounded-md border bg-background px-2 text-sm"
    >
      {ROLE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
