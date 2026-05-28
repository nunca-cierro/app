import { describe, expect, it } from "vitest";
import { getNavItems, type NavItem } from "@/components/layout/sidebar";

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

describe("sidebar nav items", () => {
  it("adds Plataformas section with children", () => {
    const items = getNavItems();
    // Top level: Dashboard, Negocios, Agentes, Plataformas, Conversaciones
    expect(items.length).toBe(5);
    expect(items.map((i) => i.label)).toEqual([
      "Dashboard",
      "Negocios",
      "Agentes",
      "Plataformas",
      "Conversaciones",
    ]);

    // All labels including children
    const labels = allLabels(items);
    expect(labels).toContain("WhatsApp (Evo)");
    expect(labels).toContain("WhatsApp (Meta)");
    expect(labels).toContain("Telegram");
  });

  it("Plataformas section has collapsible structure", () => {
    const items = getNavItems();
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
    const items = getNavItems();
    const wa = findItem(items, "WhatsApp (Evo)");
    expect(wa).toBeDefined();
    expect(wa!.icon).toBeDefined();
  });

  it("Telegram item has an icon", () => {
    const items = getNavItems();
    const tg = findItem(items, "Telegram");
    expect(tg).toBeDefined();
    expect(tg!.icon).toBeDefined();
  });
});
