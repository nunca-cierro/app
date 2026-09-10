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
  nuncacierro: "NuncaCierro",
  belleza: "Belleza",
  gimnasio: "Gimnasio",
  spa: "Spa",
};

/** Categories that ship system templates (used by the template selector).
 *  CLIENT-FACING gallery: internal categories are intentionally absent. */
export const TEMPLATE_CATEGORIES: readonly string[] = [
  "restaurante",
  "panaderia",
  "hamburgueseria",
  "barberia",
  "clinica",
];

/** Categories whose system templates are internal (superadmin-only) and must
 *  be hidden from the client gallery. Mirrors the backend registry. */
export const INTERNAL_TEMPLATE_CATEGORIES: readonly string[] = ["nuncacierro"];

/** Template-selector entries: value (slug) + label + category key. */
export function templateCategoryEntries(): CategoryEntry[] {
  return TEMPLATE_CATEGORIES.map((slug) => ({
    value: slug,
    label: BUSINESS_CATEGORIES[slug] ?? slug,
  }));
}

/** Internal template-selector entries (superadmin-only). */
export function internalTemplateCategoryEntries(): CategoryEntry[] {
  return INTERNAL_TEMPLATE_CATEGORIES.map((slug) => ({
    value: slug,
    label: BUSINESS_CATEGORIES[slug] ?? slug,
  }));
}
