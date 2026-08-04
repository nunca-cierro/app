/* ------------------------------------------------------------------ */
/*  Shared business-category registry (frontend mirror)                */
/*                                                                    */
/*  Mirrors nc-api/app/modules/agents/categories.py — the backend is  */
/*  the source of truth; this file keeps the dashboard, template      */
/*  selector and landing demos on the SAME vocabulary.                */
/* ------------------------------------------------------------------ */

export interface CategoryEntry {
  value: string;
  label: string;
}

/** slug -> display label */
export const BUSINESS_CATEGORIES: Record<string, string> = {
  restaurante: "Restaurante",
  panaderia: "Panadería",
  hamburgueseria: "Hamburguesería",
  barberia: "Barbería",
  clinica: "Clínica",
  belleza: "Belleza",
  gimnasio: "Gimnasio",
  spa: "Spa",
};

/** Categories that ship system templates (used by the template selector). */
export const TEMPLATE_CATEGORIES: readonly string[] = [
  "restaurante",
  "panaderia",
  "hamburgueseria",
  "barberia",
  "clinica",
];

/** Legacy demo keys, english slugs and display labels -> canonical slug. */
const CATEGORY_ALIASES: Record<string, string> = {
  "restaurante-elite": "restaurante",
  "barberia-clasica": "barberia",
  "beauty-studio": "belleza",
  "gym-performance": "gimnasio",
  "spa-serenity": "spa",
  "clinica-dental-pro": "clinica",
  restaurant: "restaurante",
  bakery: "panaderia",
  burger: "hamburgueseria",
  barbershop: "barberia",
  barber: "barberia",
  clinic: "clinica",
  dental: "clinica",
  beauty: "belleza",
  gym: "gimnasio",
  restaurante: "restaurante",
  panaderia: "panaderia",
  hamburgueseria: "hamburgueseria",
  barberia: "barberia",
  clinica: "clinica",
  "clinica dental": "clinica",
  "clinica-dental": "clinica",
  belleza: "belleza",
  gimnasio: "gimnasio",
  spa: "spa",
};

/** Lowercase, strip accents, collapse non-alphanumerics to single dashes. */
function normalize(value: string): string {
  const ascii = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return ascii.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Map any known alias/label to its canonical slug (unknown kept as-is). */
export function canonicalizeCategory(value: string | null | undefined): string | undefined {
  if (value == null) return undefined;
  const normalized = normalize(value);
  if (!normalized) return "";
  return CATEGORY_ALIASES[normalized] ?? normalized;
}

/** True when the value canonicalizes to a registered category slug. */
export function isKnownCategory(value: string | null | undefined): boolean {
  const slug = canonicalizeCategory(value);
  return slug != null && slug in BUSINESS_CATEGORIES;
}

/** Display label for a canonical slug (undefined when unknown). */
export function categoryLabel(slug: string | null | undefined): string | undefined {
  if (slug == null) return undefined;
  return BUSINESS_CATEGORIES[slug];
}

/** Template-selector entries: value (slug) + label + category key. */
export function templateCategoryEntries(): CategoryEntry[] {
  return TEMPLATE_CATEGORIES.map((slug) => ({
    value: slug,
    label: BUSINESS_CATEGORIES[slug] ?? slug,
  }));
}
