import fs from "node:fs";
import path from "node:path";
import type { DemoProfile } from "./types";

export * from "./types";

export interface DemoLookupResult {
  profile: DemoProfile;
  isCustom: boolean;
}

export const defaultDemoProfile: DemoProfile = {
  slug: "demo",
  businessName: "Nunca Cierro",
  brandAccent: "Atención y Ventas 24/7",
  categoryName: "Automatización Comercial",
  eyebrow: "Demostración Interactiva",
  title: "Automatización Inteligente de WhatsApp para tu Negocio",
  subtitle: "Atención continua, calificación de prospectos y agendamiento sin esperas.",
  address: "Bogotá, Colombia",
  phone: "+57 312 493 2822",
  whatsappNumber: "573124932822",
  schedule: "24 horas al día, 7 días a la semana",
  instagram: "@nuncacierro",
  services: [
    {
      title: "Atención y Calificación Automática",
      price: "Desde $390.000 COP",
      description: "Respuestas inmediatas a dudas frecuentes y calificación de clientes.",
    },
    {
      title: "Agendamiento y Citas 24/7",
      price: "Incluido",
      description: "Coordinación y confirmación de citas en tiempo real.",
    },
  ],
  serviceChips: ["Atención 24/7", "Calificación de Leads", "Agendamiento"],
  packages: [
    {
      name: "Plan Profesional",
      price: "$790.000 COP/mes",
      description: "Atención comercial completa con Inteligencia Artificial.",
      includes: ["Hasta 10.000 respuestas IA", "RAG con catálogo oficial", "Escalamiento a Telegram"],
      featured: true,
    },
  ],
  galleryImages: [],
  beforeAfterCases: [],
  testimonials: [],
  faqs: [
    {
      question: "¿Cómo funciona la atención automatizada?",
      answer: "El asistente responde preguntas frecuentes, califica prospectos y escala con un asesor humano cuando hay interés de compra.",
    },
  ],
  benefitBox: {
    eyebrow: "Automatización Comercial",
    title: "Nunca pierdas un cliente por responder tarde",
    ctaText: "Probar en WhatsApp",
  },
};

// Retrocompatibilidad para imports existentes
export const aestheticDefaultProfile = defaultDemoProfile;

const DEMOS_DIR = path.join(process.cwd(), "lib/demos");

/**
 * Escanea la carpeta lib/demos/ para listar todos los slugs disponibles automáticamente.
 * Ignora archivos estructurales como index.ts, types.ts o archivos de test.
 */
export function getAllDemoSlugs(): string[] {
  try {
    if (!fs.existsSync(DEMOS_DIR)) return [];
    const files = fs.readdirSync(DEMOS_DIR);
    const slugs = files
      .filter((file) => {
        if (!file.endsWith(".ts") && !file.endsWith(".js")) return false;
        const name = path.basename(file, path.extname(file));
        return name !== "index" && name !== "types" && !name.includes(".test");
      })
      .map((file) => path.basename(file, path.extname(file)));

    return slugs;
  } catch {
    return [];
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
      profile: defaultDemoProfile,
      isCustom: false,
    };
  }

  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!cleanSlug) {
    return {
      profile: defaultDemoProfile,
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

  // 3. Fallback al demo predeterminado
  return {
    profile: defaultDemoProfile,
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
