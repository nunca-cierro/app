import { afterEach, describe, expect, it, vi } from "vitest";
import {
  apiClient,
  getCsrfToken,
  login,
  logout,
  register,
  switchTenant,
} from "@/lib/api";

/**
 * Slice B transport tests (AS-6/AS-9): every fetch carries
 * credentials:"include", no Authorization header is ever built, no
 * localStorage is read/written, X-CSRF-Token is injected on mutations only,
 * and a 401 redirects to /auth/login WITHOUT storage cleanup.
 *
 * The vitest environment is node — `document`/`window`/`localStorage` are
 * stubbed explicitly where the code under test touches them.
 */

function stubFetch(response: Response) {
  const fetchMock = vi.fn(
    async (_url: string | URL | Request, _init?: RequestInit) => response,
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function stubDocumentCookie(cookie: string) {
  vi.stubGlobal("document", { cookie });
}

function stubBrowserGlobals() {
  const location: { href: string } = { href: "" };
  vi.stubGlobal("window", { location });
  const storage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  vi.stubGlobal("localStorage", storage);
  return { location, storage };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getCsrfToken", () => {
  it("extracts nc_csrf from document.cookie", () => {
    stubDocumentCookie("theme=dark; nc_csrf=abc123; other=1");
    expect(getCsrfToken()).toBe("abc123");
  });

  it("returns null when nc_csrf is absent", () => {
    stubDocumentCookie("theme=dark; other=1");
    expect(getCsrfToken()).toBeNull();
  });

  it("returns null without a document (SSR)", () => {
    expect(getCsrfToken()).toBeNull();
  });
});

describe("login", () => {
  it("sends credentials include and never touches localStorage", async () => {
    const { storage } = stubBrowserGlobals();
    const fetchMock = stubFetch(
      new Response(
        JSON.stringify({
          user_id: "u1",
          email: "a@b.co",
          name: "A",
          role: "client",
          tenant_id: null,
          capabilities: [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await login("a@b.co", "pw123456");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/auth/login");
    expect((init as RequestInit).credentials).toBe("include");
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});

describe("register and switchTenant", () => {
  it("register sends credentials include", async () => {
    const fetchMock = stubFetch(
      new Response(JSON.stringify({ user_id: "u2", role: "client" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await register("b@c.co", "pw123456", "B");
    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).credentials).toBe("include");
  });

  it("switchTenant sends credentials include", async () => {
    const fetchMock = stubFetch(
      new Response(JSON.stringify({ user_id: "u1", role: "client" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await switchTenant("t1");
    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).credentials).toBe("include");
  });
});

describe("apiClient", () => {
  it("sends credentials include and no Authorization header", async () => {
    stubDocumentCookie("");
    const fetchMock = stubFetch(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await apiClient("/api/v1/tenants");

    const [, init] = fetchMock.mock.calls[0];
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect((init as RequestInit).credentials).toBe("include");
    expect(headers.Authorization).toBeUndefined();
  });

  it("injects X-CSRF-Token on POST/PUT/PATCH/DELETE when the cookie exists", async () => {
    stubDocumentCookie("nc_csrf=csrf-xyz");
    const fetchMock = vi.fn(
      async (_url: string | URL | Request, _init?: RequestInit) =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      await apiClient("/api/v1/tenants", { method });
      const [, init] = fetchMock.mock.calls.at(-1)!;
      const headers = (init as RequestInit).headers as Record<string, string>;
      expect(headers["X-CSRF-Token"]).toBe("csrf-xyz");
    }
  });

  it("never injects X-CSRF-Token on GET", async () => {
    stubDocumentCookie("nc_csrf=csrf-xyz");
    const fetchMock = stubFetch(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await apiClient("/api/v1/tenants");

    const [, init] = fetchMock.mock.calls[0];
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["X-CSRF-Token"]).toBeUndefined();
  });

  it("omits X-CSRF-Token on mutations when no nc_csrf cookie is present", async () => {
    stubDocumentCookie("other=1");
    const fetchMock = stubFetch(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await apiClient("/api/v1/tenants", { method: "POST" });

    const [, init] = fetchMock.mock.calls[0];
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["X-CSRF-Token"]).toBeUndefined();
  });

  it("redirects to /auth/login on 401 with NO storage cleanup", async () => {
    const { location, storage } = stubBrowserGlobals();
    stubFetch(new Response("Unauthorized", { status: 401 }));

    await expect(apiClient("/api/v1/tenants")).rejects.toThrow("Unauthorized");

    expect(location.href).toBe("/auth/login");
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(storage.clear).not.toHaveBeenCalled();
  });
});

describe("logout", () => {
  it("POSTs /auth/logout with credentials include", async () => {
    stubDocumentCookie("nc_csrf=csrf-xyz");
    const fetchMock = stubFetch(
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await logout();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/auth/logout");
    expect((init as RequestInit).method).toBe("POST");
    expect((init as RequestInit).credentials).toBe("include");
  });
});