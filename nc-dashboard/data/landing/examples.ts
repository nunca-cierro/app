import {
  restauranteEliteDemo,
  spaSerenityDemo,
  gymPerformanceDemo,
  barberiaClasicaDemo,
  beautyStudioDemo,
  clinicaDentalProDemo,
} from "./demos";
import type { DemoItem } from "./demos/types";

export type { DemoItem };

export const demoItems: DemoItem[] = [
  restauranteEliteDemo,
  spaSerenityDemo,
  gymPerformanceDemo,
  barberiaClasicaDemo,
  beautyStudioDemo,
  clinicaDentalProDemo,
];

export const landingExamples = {
  sectionId: "ejemplos",
  label: "Ejemplos",
  title: "Así podría verse tu sitio web",
  subtitle: "Estos son ejemplos de páginas que podemos hacer para tu negocio.",
  secondarySubtitle:
    "Creamos páginas web para negocios con enfoque en resultados, diseño profesional y contenido optimizado para atraer clientes.",
  imageAltPrefix: "Demo",
    whatsappMessageTemplate:
      "Hola, quiero una página web para mi negocio similar al demo {demoName}. Quiero un diseño profesional para mi marca.",
  buttons: {
    viewDemo: "Ver Demo",
    quoteSimilar: "Quiero una web así",
    openDemo: "Abrir demo",
    quoteWhatsapp: "Cotizar por WhatsApp",
  },
  modal: {
    closeLabel: "Cerrar detalle",
    closeText: "Cerrar",
  },
  cta: {
    title: "¿Quieres una web como estas?",
    description:
      "Te diseñamos una página a medida con estructura de venta, branding sólido y enfoque de resultados para tu negocio.",
    buttonLabel: "Cotizar por WhatsApp",
  },
  demos: demoItems,
};
