import { describe, expect, it } from "vitest";
import {
  getDemoProfileBySlug,
  getAllDemoSlugs,
  defaultDemoProfile,
  aestheticDefaultProfile,
} from "@/lib/demos-config";

describe("demos-config dynamic loader", () => {
  it("automatically discovers files in lib/demos directory excluding index and types", () => {
    const slugs = getAllDemoSlugs();
    expect(slugs).toContain("consultora");
    expect(slugs).toContain("firma-contable");
    expect(slugs).toContain("abogados");
    expect(slugs).toContain("dermatologia");
    expect(slugs).not.toContain("index");
    expect(slugs).not.toContain("types");
  });

  it("retrieves consultora profile dynamically with valid business services", async () => {
    const { profile, isCustom } = await getDemoProfileBySlug("consultora");
    expect(isCustom).toBe(true);
    expect(profile.businessName).toBe("Vanguardia Consultoría Empresarial");
    expect(profile.categoryName.toLowerCase()).toContain("consultoría");
    expect(profile.services.length).toBeGreaterThan(0);
  });

  it("retrieves firma-contable profile dynamically with accounting and tax services", async () => {
    const { profile, isCustom } = await getDemoProfileBySlug("firma-contable");
    expect(isCustom).toBe(true);
    expect(profile.businessName).toBe("Alianza Contable & Tributaria");
    expect(profile.categoryName.toLowerCase()).toContain("contadores");
    expect(profile.packages.length).toBeGreaterThan(0);
  });

  it("retrieves abogados profile dynamically with legal services", async () => {
    const { profile, isCustom } = await getDemoProfileBySlug("abogados");
    expect(isCustom).toBe(true);
    expect(profile.businessName).toBe("Lex & Asociados Firma Jurídica");
    expect(profile.categoryName.toLowerCase()).toContain("abogados");
    expect(profile.beforeAfterCases.length).toBeGreaterThan(0);
  });

  it("retrieves dermatologia profile dynamically with clinical skincare services", async () => {
    const { profile, isCustom } = await getDemoProfileBySlug("dermatologia");
    expect(isCustom).toBe(true);
    expect(profile.businessName).toBe("Clínica Dermatológica Dermis");
    expect(profile.categoryName.toLowerCase()).toContain("dermatología");
    expect(profile.services.length).toBeGreaterThan(0);
  });

  it("handles case-insensitivity cleanly", async () => {
    const { profile, isCustom } = await getDemoProfileBySlug("Dermatologia");
    expect(isCustom).toBe(true);
    expect(profile.businessName).toBe("Clínica Dermatológica Dermis");
  });

  it("falls back cleanly to default profile for unknown slugs", async () => {
    const { profile, isCustom } = await getDemoProfileBySlug("negocio-desconocido-123");
    expect(isCustom).toBe(false);
    expect(profile.businessName).toBe(defaultDemoProfile.businessName);
    expect(profile.slug).toBe(defaultDemoProfile.slug);
  });

  it("falls back cleanly when slug is undefined or empty", async () => {
    const emptySlug = await getDemoProfileBySlug("");
    const undefinedSlug = await getDemoProfileBySlug(undefined);

    expect(emptySlug.profile.slug).toBe(defaultDemoProfile.slug);
    expect(undefinedSlug.profile.slug).toBe(defaultDemoProfile.slug);
    expect(aestheticDefaultProfile.slug).toBe(defaultDemoProfile.slug);
  });

  it("strictly avoids emojis across all demo profiles text strings per AGENTS.md", async () => {
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
      profile.packages.forEach((pkg, idx) => {
        checkText(pkg.name, `${slug}.packages[${idx}].name`);
        checkText(pkg.description, `${slug}.packages[${idx}].description`);
        pkg.includes.forEach((inc, incIdx) => {
          checkText(inc, `${slug}.packages[${idx}].includes[${incIdx}]`);
        });
      });
      profile.faqs.forEach((f, idx) => {
        checkText(f.question, `${slug}.faqs[${idx}].question`);
        checkText(f.answer, `${slug}.faqs[${idx}].answer`);
      });
      profile.testimonials.forEach((t, idx) => {
        checkText(t.name, `${slug}.testimonials[${idx}].name`);
        checkText(t.service, `${slug}.testimonials[${idx}].service`);
        checkText(t.text, `${slug}.testimonials[${idx}].text`);
      });
      profile.beforeAfterCases.forEach((ba, idx) => {
        checkText(ba.title, `${slug}.beforeAfterCases[${idx}].title`);
        checkText(ba.before, `${slug}.beforeAfterCases[${idx}].before`);
        checkText(ba.after, `${slug}.beforeAfterCases[${idx}].after`);
      });
    }
  });

  it("uses the official updated WhatsApp number", async () => {
    const slugs = ["consultora", "firma-contable", "abogados", "dermatologia"];
    for (const slug of slugs) {
      const { profile } = await getDemoProfileBySlug(slug);
      expect(profile.whatsappNumber).toBe("573124932822");
    }
  });
});
