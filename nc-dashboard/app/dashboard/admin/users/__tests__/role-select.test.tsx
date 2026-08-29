import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import { ApiError } from "@/lib/api";

/**
 * The vitest environment is node (no jsdom), so components are rendered with
 * react-dom/server (pattern: anti-spam-indicator.test.tsx). Event handlers
 * can't fire in SSR, so interaction logic is covered by pure exported helpers
 * (canEditUserRole, roleChangeErrorToastMessage) and presence/absence is
 * asserted on the rendered HTML — the DOM-absence requirement (R3) is a
 * rendered-output property, which is exactly what SSR proves.
 */

const mocks = vi.hoisted(() => ({
  authUser: {
    id: "sa-1",
    email: "sa@test.com",
    name: "Súper Admin",
    role: "superadmin",
    current_role: "superadmin",
  } as Record<string, unknown>,
  users: [] as Array<Record<string, unknown>>,
  updateUserRole: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: mocks.authUser }),
}));

vi.mock("@/hooks/use-users", () => ({
  useUsers: () => ({
    users: mocks.users,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    createUser: vi.fn(),
    assignTenant: vi.fn(),
    updateUserRole: mocks.updateUserRole,
    deleteUser: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-tenants", () => ({
  useTenants: () => ({ tenants: [] }),
}));

import {
  ROLE_OPTIONS,
  ASSIGNABLE_ROLE_OPTIONS,
  canEditUserRole,
  roleChangeErrorToastMessage,
  RoleSelect,
} from "@/app/dashboard/admin/users/components/role-select";
import AdminUsersPage from "@/app/dashboard/admin/users/page";

function makeUser(extra: Record<string, unknown>): Record<string, unknown> {
  return {
    id: "u-2",
    email: "admin@test.com",
    name: "Admin Uno",
    role: "admin",
    created_at: "2026-01-15T10:00:00Z",
    tenants: [],
    ...extra,
  };
}

function renderToHtml(element: React.ReactElement): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const { pipe } = renderToPipeableStream(element, {
      onError: reject,
      onAllReady: () => {
        const sink = new PassThrough();
        sink.on("data", (chunk: Buffer) => chunks.push(chunk));
        sink.on("end", () =>
          resolve(Buffer.concat(chunks).toString("utf8")),
        );
        sink.on("error", reject);
        pipe(sink);
      },
    });
  });
}

function optionTags(html: string): string[] {
  return html.match(/<option[^>]*>/g) ?? [];
}

function selectTags(html: string): string[] {
  return html.match(/<select[^>]*>/g) ?? [];
}

describe("canEditUserRole (pure gate)", () => {
  it("allows a superadmin editing another user's role", () => {
    const viewer = { id: "sa-1", current_role: "superadmin", role: "admin" };
    expect(canEditUserRole(viewer, "u-2")).toBe(true);
  });

  it("blocks a superadmin from editing their own row", () => {
    const viewer = { id: "sa-1", current_role: "superadmin", role: "superadmin" };
    expect(canEditUserRole(viewer, "sa-1")).toBe(false);
  });

  it("blocks non-superadmin viewers even on other users", () => {
    expect(
      canEditUserRole({ id: "a-1", current_role: "admin", role: "admin" }, "u-2"),
    ).toBe(false);
    expect(
      canEditUserRole({ id: "c-1", current_role: "client", role: "client" }, "u-2"),
    ).toBe(false);
  });

  it("falls back to role when current_role is absent", () => {
    expect(canEditUserRole({ id: "sa-1", role: "superadmin" }, "u-2")).toBe(true);
  });

  it("blocks when there is no viewer session", () => {
    expect(canEditUserRole(null, "u-2")).toBe(false);
    expect(canEditUserRole(undefined, "u-2")).toBe(false);
  });
});

describe("role option constants", () => {
  it("assign-form options exclude superadmin (R4)", () => {
    const values = ASSIGNABLE_ROLE_OPTIONS.map((option) => option.value);
    expect(values).toEqual(["client", "agent", "admin"]);
    expect(values).not.toContain("superadmin");
  });

  it("role-edit select offers all four roles (D7)", () => {
    const values = ROLE_OPTIONS.map((option) => option.value);
    expect(values).toEqual(["client", "agent", "admin", "superadmin"]);
  });
});

describe("roleChangeErrorToastMessage (pure)", () => {
  it("surfaces the backend ApiError message (e.g. last-superadmin 400 detail)", () => {
    const err = new ApiError(400, "No puedes degradar al último superadmin");
    expect(roleChangeErrorToastMessage(err)).toBe(
      "No puedes degradar al último superadmin",
    );
  });

  it("falls back to the generic Spanish message for non-ApiError failures", () => {
    expect(roleChangeErrorToastMessage(new Error("boom"))).toBe(
      "Error al actualizar el rol",
    );
    expect(roleChangeErrorToastMessage("string error")).toBe(
      "Error al actualizar el rol",
    );
  });
});

describe("RoleSelect (SSR render)", () => {
  it("renders an enabled role select with all four options for a superadmin editing another user", async () => {
    mocks.authUser.id = "sa-1";
    mocks.authUser.current_role = "superadmin";
    mocks.authUser.role = "superadmin";
    const target = makeUser({ id: "u-2", role: "admin" });

    const html = await renderToHtml(
      React.createElement(RoleSelect, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        user: target as any,
        onRoleChange: async () => {},
      }),
    );

    const selects = selectTags(html);
    expect(selects).toHaveLength(1);
    const options = optionTags(html);
    expect(options).toHaveLength(4);
    expect(html).toContain('value="superadmin"');
    expect(html).toContain('value="admin"');
    expect(html).toContain('value="agent"');
    expect(html).toContain('value="client"');
    // The select is bound to the target row (Spanish aria-label carries identity)
    expect(html).toContain("Cambiar rol de admin@test.com");
    // Current role preselected
    const adminOption = options.find((tag) => tag.includes('value="admin"'));
    expect(adminOption).toContain("selected");
  });

  it("renders nothing for a non-superadmin viewer (DOM-absence, R3)", async () => {
    mocks.authUser.id = "a-1";
    mocks.authUser.current_role = "admin";
    mocks.authUser.role = "admin";
    const target = makeUser({ id: "u-2" });

    const html = await renderToHtml(
      React.createElement(RoleSelect, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        user: target as any,
        onRoleChange: async () => {},
      }),
    );

    expect(html).toBe("");
  });

  it("renders nothing when a superadmin views their own row", async () => {
    mocks.authUser.id = "sa-1";
    mocks.authUser.current_role = "superadmin";
    mocks.authUser.role = "superadmin";
    const self = makeUser({ id: "sa-1", role: "superadmin" });

    const html = await renderToHtml(
      React.createElement(RoleSelect, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        user: self as any,
        onRoleChange: async () => {},
      }),
    );

    expect(html).toBe("");
  });

  it("is a React component function (payment-status-toggle pattern)", () => {
    expect(typeof RoleSelect).toBe("function");
  });
});

describe("AdminUsersPage — Rol column wiring (SSR)", () => {
  it("shows the inline role select on other users' rows and a plain badge on the own row for a superadmin", async () => {
    mocks.authUser.id = "sa-1";
    mocks.authUser.current_role = "superadmin";
    mocks.authUser.role = "superadmin";
    mocks.users = [
      makeUser({ id: "sa-1", email: "sa@test.com", role: "superadmin" }),
      makeUser({ id: "u-2", email: "admin@test.com", role: "admin" }),
    ];

    const html = await renderToHtml(React.createElement(AdminUsersPage));

    // Exactly one select: the target's role editor (own row keeps the Badge)
    expect(selectTags(html)).toHaveLength(1);
    expect(optionTags(html)).toHaveLength(4);
    expect(html).toContain("Cambiar rol de admin@test.com");
    // Own row renders the role as a plain badge (no select bound to sa@test.com)
    expect(html).not.toContain("Cambiar rol de sa@test.com");
    expect(html).toContain("Superadmin");
  });

  it("renders no role select anywhere for a non-superadmin viewer (DOM-absence, R3)", async () => {
    mocks.authUser.id = "a-1";
    mocks.authUser.current_role = "admin";
    mocks.authUser.role = "admin";
    mocks.users = [
      makeUser({ id: "sa-1", email: "sa@test.com", role: "superadmin" }),
      makeUser({ id: "u-2", email: "admin@test.com", role: "admin" }),
    ];

    const html = await renderToHtml(React.createElement(AdminUsersPage));

    expect(selectTags(html)).toHaveLength(0);
    expect(optionTags(html)).toHaveLength(0);
    // Roles are still visible as badges (raw role values)
    expect(html).toContain(">superadmin</div>");
    expect(html).toContain(">admin</div>");
    // No PATCH can be fired from a field that does not exist
    expect(mocks.updateUserRole).not.toHaveBeenCalled();
  });
});
