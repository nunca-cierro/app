import fs from "node:fs";
import path from "node:path";
import type { DemoProfile } from "./types";
import { aestheticDefaultProfile } from "./estetica";

export * from "./types";
export { aestheticDefaultProfile } from "./estetica";

export interface DemoLookupResult {
  profile: DemoProfile;
  isCustom: boolean;
}

const DEMOS_DIR = path.join(process.cwd(), "lib/demos");

/**
 * Escanea la carpeta lib/demos/ para listar todos los slugs disponibles automáticamente.
 * Ignora archivos estructurales como index.ts, types.ts o archivos de test.
 */
export function getAllDemoSlugs(): string[] {
  try {
    if (!fs.existsSync(DEMOS_DIR)) return ["estetica"];
    const files = fs.readdirSync(DEMOS_DIR);
    const slugs = files
      .filter((file) => {
        if (!file.endsWith(".ts") && !file.endsWith(".js")) return false;
        const name = path.basename(file, path.extname(file));
        return name !== "index" && name !== "types" && !name.includes(".test");
      })
      .map((file) => path.basename(file, path.extname(file)));

    return slugs.length > 0 ? slugs : ["estetica"];
  } catch {
    return ["estetica"];
  }
}

/**
 * Carga un DemoProfile dinámicamente según el slug solicitado.
 * Si colocas un archivo nuevo `lib/demos/mi-negocio.ts`, se resolverá automáticamente
 * sin necesidad de registrarlo en ningún índice o lista estática.
 */
export async function getDemoProfileBySlug(slug?: string): Promise<DemoLookupResult> {
  if (!slug) {
    return {
      profile: aestheticDefaultProfile,
      isCustom: false,
    };
  }

  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!cleanSlug) {
    return {
      profile: aestheticDefaultProfile,
      isCustom: false,
    };
  }

  // 1. Intentar resolver directamente por nombre de archivo en lib/demos/${cleanSlug}.ts
  const candidatePath = path.join(DEMOS_DIR, `${cleanSlug}.ts`);
  if (fs.existsSync(candidatePath)) {
    try {
      const importedMod = await import(`./${cleanSlug}.ts`);
      const profile = extractDemoProfile(importedMod);
      if (profile) {
        return {
          profile,
          isCustom: true,
        };
      }
    } catch {
      // Si falla la importación dinámica, continúa al fallback
    }
  }

  // 2. Si no coincide el nombre de archivo exacto, busca en los archivos disponibles por la propiedad `profile.slug`
  const allSlugs = getAllDemoSlugs();
  for (const fileSlug of allSlugs) {
    if (fileSlug === cleanSlug) continue;
    try {
      const importedMod = await import(`./${fileSlug}.ts`);
      const profile = extractDemoProfile(importedMod);
      if (profile && profile.slug.toLowerCase() === cleanSlug) {
        return {
          profile,
          isCustom: true,
        };
      }
    } catch {
      // Ignorar archivos que no se puedan cargar
    }
  }

  // 3. Fallback al demo predeterminado de estética
  return {
    profile: aestheticDefaultProfile,
    isCustom: false,
  };
}

function extractDemoProfile(module: Record<string, unknown>): DemoProfile | null {
  for (const value of Object.values(module)) {
    if (
      value &&
      typeof value === "object" &&
      "businessName" in value &&
      "services" in value &&
      "categoryName" in value
    ) {
      return value as DemoProfile;
    }
  }
  return null;
}
