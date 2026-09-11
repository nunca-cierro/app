import { sitePlans } from "@/data/site";

/**
 * /precios — live SaaS pricing page for WhatsApp automation (Escenario A,
 * owner-validated). Prices are pure copy strings (never runtime arithmetic)
 * and come from `sitePlans` (single source). The web one-time service stays in
 * `data/landing/pricing.ts` and is linked as a SEPARATE product line.
 */
export const preciosPage = {
  sectionId: "precios",
  hero: {
    label: "Precios",
    title: "Planes de automatización WhatsApp para su negocio",
    subtitle:
      "Su negocio nunca cierra: el bot responde, agenda citas y vende por WhatsApp las 24 horas, todos los días. Precios mensuales con IVA, sin contratos largos.",
    cta: {
      primary: {
        label: "Agendar asesoría gratis",
        whatsappText: sitePlans.advisoryCta.whatsappText,
      },
      secondary: {
        label: "Ver cómo funciona",
        href: "/#faq",
      },
    },
    trust: [
      "7 días de prueba gratis",
      "Sin permanencia",
      "Configuración incluida",
    ],
  },
  trialNote:
    "Durante la prueba las respuestas son programadas (sin inteligencia artificial).",
  corporate: {
    ctaLabel: "Cotizar plan Corporativo",
    whatsappText:
      "Hola, quiero cotizar el plan Corporativo de automatización para mi negocio.\n\nMi negocio es: \nVolumen aproximado de consultas al mes: \n¿Qué necesito?:",
  },
};