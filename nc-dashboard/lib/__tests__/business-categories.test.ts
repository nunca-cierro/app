import { describe, expect, it } from "vitest";

import {
  BUSINESS_CATEGORIES,
  TEMPLATE_CATEGORIES,
  canonicalizeCategory,
  categoryLabel,
  isKnownCategory,
} from "@/lib/business-categories";
import { demoItems } from "@/data/landing/examples";

describe("business-categories registry", () => {
  it("covers template categories with labels", () => {
    expect(BUSINESS_CATEGORIES.restaurante).toBe("Restaurante");
    expect(BUSINESS_CATEGORIES.panaderia).toBe("Panadería");
    expect(BUSINESS_CATEGORIES.hamburgueseria).toBe("Hamburguesería");
    expect(BUSINESS_CATEGORIES.barberia).toBe("Barbería");
    expect(BUSINESS_CATEGORIES.clinica).toBe("Clínica");
  });

  it("template categories are a subset of the registry", () => {
    for (const slug of TEMPLATE_CATEGORIES) {
      expect(slug in BUSINESS_CATEGORIES).toBe(true);
    }
  });

  it("labels are unique", () => {
    const labels = Object.values(BUSINESS_CATEGORIES);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("canonicalizeCategory", () => {
  it("passes canonical slugs through", () => {
    expect(canonicalizeCategory("restaurante")).toBe("restaurante");
  });

  it("maps legacy demo keys to canonical slugs", () => {
    expect(canonicalizeCategory("restaurante-elite")).toBe("restaurante");
    expect(canonicalizeCategory("barberia-clasica")).toBe("barberia");
    expect(canonicalizeCategory("beauty-studio")).toBe("belleza");
    expect(canonicalizeCategory("gym-performance")).toBe("gimnasio");
    expect(canonicalizeCategory("spa-serenity")).toBe("spa");
    expect(canonicalizeCategory("clinica-dental-pro")).toBe("clinica");
  });

  it("maps display labels to slugs", () => {
    expect(canonicalizeCategory("Restaurante")).toBe("restaurante");
    expect(canonicalizeCategory("Barbería")).toBe("barberia");
    expect(canonicalizeCategory("Clínica Dental")).toBe("clinica");
  });

  it("keeps unknown categories unchanged", () => {
    expect(canonicalizeCategory("mi-rubro-custom")).toBe("mi-rubro-custom");
  });
});

describe("category helpers", () => {
  it("isKnownCategory", () => {
    expect(isKnownCategory("restaurante")).toBe(true);
    expect(isKnownCategory("mi-rubro-custom")).toBe(false);
  });

  it("categoryLabel", () => {
    expect(categoryLabel("restaurante")).toBe("Restaurante");
    expect(categoryLabel("nope")).toBeUndefined();
  });
});

describe("landing demos carry canonical category slugs", () => {
  it("every demo maps to a known category", () => {
    expect(demoItems.length).toBeGreaterThan(0);
    for (const demo of demoItems) {
      const slug = demo.categorySlug;
      expect(isKnownCategory(slug), `${demo.name} -> ${slug}`).toBe(true);
    }
  });

  it("demos share the same vocabulary as templates where they overlap", () => {
    const restaurante = demoItems.find((d) => d.href === "/demo/restaurant");
    expect(restaurante?.categorySlug).toBe("restaurante");
    const barberia = demoItems.find((d) => d.href === "/demo/barberia");
    expect(barberia?.categorySlug).toBe("barberia");
  });
});
