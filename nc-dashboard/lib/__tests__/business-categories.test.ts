import { describe, expect, it } from "vitest";

import {
  BUSINESS_CATEGORIES,
  INTERNAL_TEMPLATE_CATEGORIES,
  TEMPLATE_CATEGORIES,
  internalTemplateCategoryEntries,
  templateCategoryEntries,
} from "@/lib/business-categories";

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

  it("registers nuncacierro as a business category", () => {
    expect(BUSINESS_CATEGORIES.nuncacierro).toBe("NuncaCierro");
  });

  it("keeps nuncacierro OUT of the client-facing template gallery", () => {
    expect(TEMPLATE_CATEGORIES).not.toContain("nuncacierro");
    expect(templateCategoryEntries().map((e) => e.value)).not.toContain(
      "nuncacierro",
    );
  });

  it("mirrors the backend internal category list", () => {
    expect(INTERNAL_TEMPLATE_CATEGORIES).toEqual(["nuncacierro"]);
  });

  it("internalTemplateCategoryEntries returns the nuncacierro entry", () => {
    expect(internalTemplateCategoryEntries()).toEqual([
      { value: "nuncacierro", label: "NuncaCierro" },
    ]);
  });
});
