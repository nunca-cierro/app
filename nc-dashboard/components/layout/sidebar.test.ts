import { describe, expect, it } from "vitest";
import { getNavItems, type NavItem } from "@/components/layout/sidebar";
import type { UserRole } from "@/lib/types";

/** Recursively find a nav item by label */
function findItem(items: NavItem[], label: string): NavItem | undefined {
  for (const item of items) {
    if (item.label === label) return item;
    if (item.children) {
      const found = findItem(item.children, label);
      if (found) return found;
    }
  }
  return undefined;
}

/** Recursively collect all labels */
function allLabels(items: NavItem[]): string[] {
  const labels: string[] = [];
  for (const item of items) {
    labels.push(item.label);
    if (item.children) {
      labels.push(...allLabels(item.children));
    }
  }
  return labels;
}

describe("sidebar nav items — superadmin", () => {
  const role: UserRole = "superadmin";

  it("shows all items for superadmin", () => {
    const items = getNavItems(role);
    expect(items.length).toBe(6);
    expect(items.map((i) => i.label)).toEqual([
      "Dashboard",
      "Negocios",
      "Admin",
      "Agentes",
      "Plataformas",
      "Conversaciones",
    ]);

    const labels = allLabels(items);
    expect(labels).toContain("WhatsApp (Evo)");
    expect(labels).toContain("WhatsApp (Meta)");
    expect(labels).toContain("Telegram");
    expect(labels).toContain("Usuarios");
  });

  it("Plataformas section has collapsible structure", () => {
    const items = getNavItems(role);
    const plataformas = items.find((i) => i.label === "Plataformas");
    expect(plataformas).toBeDefined();
    expect(plataformas!.children).toBeDefined();
    expect(plataformas!.children!.length).toBe(3);
    expect(plataformas!.children!.map((c) => c.label)).toEqual([
      "WhatsApp (Evo)",
      "WhatsApp (Meta)",
      "Telegram",
    ]);
  });

  it("WhatsApp (Evo) item retains its icon", () => {
    const items = getNavItems(role);
    const wa = findItem(items, "WhatsApp (Evo)");
    expect(wa).toBeDefined();
    expect(wa!.icon).toBeDefined();
  });

  it("Telegram item has an icon", () => {
    const items = getNavItems(role);
    const tg = findItem(items, "Telegram");
    expect(tg).toBeDefined();
    expect(tg!.icon).toBeDefined();
  });
});

describe("sidebar nav items — client", () => {
  const role: UserRole = "client";

  it("hides Negocios, Agentes and Plataformas for client role", () => {
    const items = getNavItems(role);
    const labels = items.map((i) => i.label);
    expect(labels).not.toContain("Negocios");
    expect(labels).not.toContain("Agentes");
    expect(labels).not.toContain("Plataformas");
  });

  it("shows Dashboard and Conversaciones for client role", () => {
    const items = getNavItems(role);
    const labels = items.map((i) => i.label);
    expect(labels).toContain("Dashboard");
    expect(labels).toContain("Conversaciones");
  });

  it("shows only 2 items for client role", () => {
    const items = getNavItems(role);
    expect(items.length).toBe(2);
  });
});

describe("sidebar nav items — agent", () => {
  const role: UserRole = "agent";

  it("hides Negocios, Agentes and Plataformas for agent role too", () => {
    const items = getNavItems(role);
    const labels = items.map((i) => i.label);
    expect(labels).not.toContain("Negocios");
    expect(labels).not.toContain("Agentes");
    expect(labels).not.toContain("Plataformas");
  });

  it("shows only Dashboard and Conversaciones for agent", () => {
    const items = getNavItems(role);
    expect(items.length).toBe(2);
  });
});
