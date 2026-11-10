import { describe, expect, it } from "vitest";
import {
  getDemoProfileBySlug,
  getAllDemoSlugs,
  aestheticDefaultProfile,
} from "@/lib/demos-config";

describe("demos-config dynamic loader", () => {
  it("automatically discovers files in lib/demos directory", () => {
    const slugs = getAllDemoSlugs();
    expect(slugs).toContain("estetica");
    expect(slugs).toContain("botoshop");
    expect(slugs).not.toContain("index");
    expect(slugs).not.toContain("types");
  });

  it("retrieves botoshop profile dynamically with high-ticket medical treatments", async () => {
    const { profile, isCustom } = await getDemoProfileBySlug("botoshop");
    expect(isCustom).toBe(true);
    expect(profile.businessName).toBe("Botoshop Medicina Estética");
    expect(profile.categoryName.toLowerCase()).toContain("medicina estética");

    const titles = profile.services.map((s) => s.title.toLowerCase());
    expect(titles.some((t) => t.includes("toxina botulínica") || t.includes("botox"))).toBe(true);
    expect(titles.some((t) => t.includes("ácido hialurónico") || t.includes("labios"))).toBe(true);
    expect(titles.some((t) => t.includes("valoración"))).toBe(true);
  });

  it("handles case-insensitivity cleanly", async () => {
    const { profile, isCustom } = await getDemoProfileBySlug("BotoShop");
    expect(isCustom).toBe(true);
    expect(profile.businessName).toBe("Botoshop Medicina Estética");
  });

  it("falls back cleanly to aesthetic profile for unknown slugs", async () => {
    const { profile, isCustom } = await getDemoProfileBySlug("negocio-desconocido-123");
    expect(isCustom).toBe(false);
    expect(profile.businessName).toBe(aestheticDefaultProfile.businessName);
    expect(profile.slug).toBe(aestheticDefaultProfile.slug);
  });

  it("falls back cleanly when slug is undefined or empty", async () => {
    const emptySlug = await getDemoProfileBySlug("");
    const undefinedSlug = await getDemoProfileBySlug(undefined);

    expect(emptySlug.profile.slug).toBe(aestheticDefaultProfile.slug);
    expect(undefinedSlug.profile.slug).toBe(aestheticDefaultProfile.slug);
  });

  it("strictly avoids emojis across profile text strings per AGENTS.md", async () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

    const checkText = (text: string, path: string) => {
      expect(emojiRegex.test(text), `Emoji found in ${path}: "${text}"`).toBe(false);
    };

    const slugs = getAllDemoSlugs();
    for (const slug of slugs) {
      const { profile } = await getDemoProfileBySlug(slug);
      checkText(profile.businessName, `${slug}.businessName`);
      checkText(profile.categoryName, `${slug}.categoryName`);
      checkText(profile.title, `${slug}.title`);
      checkText(profile.subtitle, `${slug}.subtitle`);
      profile.services.forEach((s, idx) => {
        checkText(s.title, `${slug}.services[${idx}].title`);
        if (s.description) checkText(s.description, `${slug}.services[${idx}].description`);
      });
      profile.faqs.forEach((f, idx) => {
        checkText(f.question, `${slug}.faqs[${idx}].question`);
        checkText(f.answer, `${slug}.faqs[${idx}].answer`);
      });
    }
  });

  it("uses the official updated WhatsApp number", async () => {
    const { profile } = await getDemoProfileBySlug("botoshop");
    expect(profile.whatsappNumber).toBe("573124932822");
  });
});
