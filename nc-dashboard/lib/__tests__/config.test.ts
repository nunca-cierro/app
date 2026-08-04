import { describe, expect, it, afterEach, vi } from "vitest";

import { INTERNAL_TENANT_SLUG } from "@/lib/config";

describe("INTERNAL_TENANT_SLUG", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to the current internal tenant slug", () => {
    expect(INTERNAL_TENANT_SLUG).toBe("nuncacierro");
  });

  it("respects NEXT_PUBLIC_INTERNAL_TENANT_SLUG override", async () => {
    vi.stubEnv("NEXT_PUBLIC_INTERNAL_TENANT_SLUG", "mi-negocio");
    vi.resetModules();
    const mod = await import("@/lib/config");
    expect(mod.INTERNAL_TENANT_SLUG).toBe("mi-negocio");
  });
});
