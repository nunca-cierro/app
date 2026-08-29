import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToPipeableStream } from "react-dom/server";
import { useUsers } from "@/hooks/use-users";

/**
 * The vitest environment is node (no jsdom), so the hook is executed inside a
 * probe component rendered with react-dom/server. Effects are skipped in SSR,
 * which means only the mutation closures run in tests — exactly the surface
 * `updateUserRole` owns (PATCH contract + refetch-after-save pattern).
 */

const mocks = vi.hoisted(() => ({
  apiClient: vi.fn(),
}));

vi.mock("@/lib/api", () => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  }
  return { ApiError, apiClient: mocks.apiClient };
});

let captured: ReturnType<typeof useUsers> | null = null;

function HookProbe(): null {
  captured = useUsers();
  return null;
}

function renderProbe(): Promise<void> {
  return new Promise((resolve, reject) => {
    renderToPipeableStream(React.createElement(HookProbe), {
      onError: reject,
      onAllReady: () => resolve(),
    });
  });
}

describe("useUsers.updateUserRole", () => {
  it("PATCHes /api/v1/admin/users/{id} with body { role } on success", async () => {
    mocks.apiClient.mockReset().mockResolvedValue(undefined);
    captured = null;
    await renderProbe();
    expect(captured).not.toBeNull();

    await captured!.updateUserRole("user-9", "agent");

    expect(mocks.apiClient).toHaveBeenCalledTimes(1);
    expect(mocks.apiClient).toHaveBeenCalledWith("/api/v1/admin/users/user-9", {
      method: "PATCH",
      body: JSON.stringify({ role: "agent" }),
    });
  });

  it("propagates ApiError so the caller can surface the backend detail", async () => {
    const rejection = Object.assign(new Error("No puedes degradar al último superadmin"), {
      status: 400,
      name: "ApiError",
    });
    mocks.apiClient.mockReset().mockRejectedValue(rejection);
    captured = null;
    await renderProbe();

    await expect(
      captured!.updateUserRole("user-9", "admin"),
    ).rejects.toMatchObject({ message: rejection.message, status: 400 });
  });
});
