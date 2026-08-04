import { describe, expect, it } from "vitest";
import { getNavSections } from "@/components/layout/sidebar";

describe("sidebar nav sections", () => {
  it("groups items into labeled sections for superadmin", () => {
    const sections = getNavSections("superadmin");
    expect(sections.map((s) => s.label)).toEqual([
      "General",
      "Gestión",
      "Comunicación",
      "Administración",
    ]);
    expect(sections[0].items.map((i) => i.label)).toEqual(["Dashboard"]);
    expect(sections[1].items.map((i) => i.label)).toEqual([
      "Negocios",
      "Agentes",
      "Conexiones",
    ]);
  });

  it("omits Gestión and Administración for client and agent roles", () => {
    for (const role of ["client", "agent"] as const) {
      const sections = getNavSections(role);
      expect(sections.map((s) => s.label)).toEqual([
        "General",
        "Comunicación",
      ]);
    }
  });

  it("filters Conexiones children by role inside the Gestión section", () => {
    const gestion = getNavSections("admin").find((s) => s.label === "Gestión");
    expect(gestion).toBeDefined();
    const conexiones = gestion!.items.find((i) => i.label === "Conexiones");
    expect(conexiones!.children!.map((c) => c.label)).toEqual(["WhatsApp"]);
  });

  it("keeps a stable flattened order for getNavItems consumers", () => {
    const flat = getNavSections("superadmin")
      .flatMap((s) => s.items)
      .map((i) => i.label);
    expect(flat).toEqual([
      "Dashboard",
      "Negocios",
      "Agentes",
      "Conexiones",
      "Conversaciones",
      "Admin",
    ]);
  });
});
