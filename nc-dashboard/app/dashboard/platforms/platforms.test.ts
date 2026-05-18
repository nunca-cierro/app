import { describe, expect, it } from "vitest";

describe("platforms page structure", () => {
  it("exports PlatformsPage from platforms/page", async () => {
    const mod = await import("@/app/dashboard/platforms/page");
    expect(mod.default).toBeDefined();
  });

  it("exports PlatformsWhatsAppPage from platforms/whatsapp/page", async () => {
    const mod = await import("@/app/dashboard/platforms/whatsapp/page");
    expect(mod.default).toBeDefined();
  });

  it("exports PlatformsNewWhatsAppPage from platforms/whatsapp/new/page", async () => {
    const mod = await import("@/app/dashboard/platforms/whatsapp/new/page");
    expect(mod.default).toBeDefined();
  });

  it("exports PlatformsWhatsAppDetailPage from platforms/whatsapp/[id]/page", async () => {
    const mod = await import("@/app/dashboard/platforms/whatsapp/[id]/page");
    expect(mod.default).toBeDefined();
  });

  it("exports TelegramConnectionsPage from platforms/telegram/page", async () => {
    const mod = await import("@/app/dashboard/platforms/telegram/page");
    expect(mod.default).toBeDefined();
  });

  it("exports NewTelegramConnectionPage from platforms/telegram/new/page", async () => {
    const mod = await import("@/app/dashboard/platforms/telegram/new/page");
    expect(mod.default).toBeDefined();
  });

  it("exports TelegramConnectionDetailPage from platforms/telegram/[id]/page", async () => {
    const mod = await import("@/app/dashboard/platforms/telegram/[id]/page");
    expect(mod.default).toBeDefined();
  });
});

describe("old whatsapp redirects", () => {
  it("old whatsapp/page redirects", async () => {
    const mod = await import("@/app/dashboard/whatsapp/page");
    expect(mod.default).toBeDefined();
  });

  it("old whatsapp/new/page redirects", async () => {
    const mod = await import("@/app/dashboard/whatsapp/new/page");
    expect(mod.default).toBeDefined();
  });

  it("old whatsapp/[id]/page redirects", async () => {
    const mod = await import("@/app/dashboard/whatsapp/[id]/page");
    expect(mod.default).toBeDefined();
  });
});
