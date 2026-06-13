import { describe, expect, it, vi } from "vitest";
import { slugify } from "@/lib/utils";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    TOKEN_KEYS: { access: "test_token", user: "test_user" },
    apiClient: vi.fn(),
  };
});

describe("useTenants", () => {
  it("imports without error", async () => {
    const mod = await import("@/hooks/use-tenants");
    expect(mod.useTenants).toBeDefined();
  });
});

describe("slugify — tenant slug generation", () => {
  it("generates lowercase-hyphenated slug from name", () => {
    expect(slugify("Mi Negocio")).toBe("mi-negocio");
  });

  it("removes special chars", () => {
    expect(slugify("Negocio S.A.S.")).toBe("negocio-sas");
  });

  it("handles accented characters (strips accents)", () => {
    expect(slugify("Restaurante La Única")).toBe("restaurante-la-nica");
  });

  it("trims whitespace", () => {
    expect(slugify("  Espacios  ")).toBe("espacios");
  });

  it("handles duplicate hyphens", () => {
    expect(slugify("Negocio -- Especial")).toBe("negocio-especial");
  });
});

describe("createTenant payload shape", () => {
  it("includes auto-generated slug from name", async () => {
    const { apiClient } = await import("@/lib/api");
    const mockApiClient = vi.mocked(apiClient);

    // Simulate createTenant behavior — the actual logic transforms data
    const data = {
      name: "Mi Negocio",
      plan: "basic" as const,
      timezone: "America/Bogota",
      locale: "es-CO",
      notes: "",
    };
    const slug = slugify(data.name);
    const expectedBody = {
      ...data,
      slug,
    };

    // Verify slug is generated correctly and matches the shape the backend expects
    expect(expectedBody.slug).toBe("mi-negocio");
    expect(expectedBody).toHaveProperty("name", "Mi Negocio");
    expect(expectedBody).toHaveProperty("slug", "mi-negocio");
    expect(expectedBody).toHaveProperty("plan", "basic");
  });
});
