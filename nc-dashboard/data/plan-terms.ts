/**
 * Plan term → short clarifying explanation (Spanish, usted, no voseo).
 *
 * Each entry maps one product concept to the tooltip text shown next to the
 * feature label in the plans section. `matches` are case-insensitive substrings
 * used to associate a comparison-row label or a package feature string with its
 * term. Order matters: more specific terms come first so `findPlanTerm` returns
 * the intended match when a string mentions several concepts (e.g. "Hasta 5
 * negocios y 10 agentes").
 */

export type PlanTerm = {
  key: string;
  matches: string[];
  explanation: string;
};

export const planTerms: PlanTerm[] = [
  {
    key: "Respuestas con IA al mes",
    matches: ["respuestas con ia"],
    explanation:
      "Mensajes respondidos por la inteligencia artificial con el contexto de su negocio. En Básico no aplica (respuestas programadas).",
  },
  {
    key: "Respuestas programadas (FAQ)",
    matches: ["programada", "faq"],
    explanation:
      "Respuestas automáticas por palabras clave y preguntas frecuentes, sin inteligencia artificial.",
  },
  {
    key: "Productos/Servicios",
    matches: ["producto", "servicio"],
    explanation:
      "Ítems del catálogo que el asistente conoce para responder precios y disponibilidad.",
  },
  {
    key: "Negocios",
    matches: ["negocio"],
    explanation:
      "Cuántas empresas puede administrar con la misma cuenta. Cada negocio tiene su propia configuración y su número de WhatsApp.",
  },
  {
    key: "Agentes",
    matches: ["agente"],
    explanation:
      "Cuántos asistentes (bots) puede crear. Puede tener varios por negocio.",
  },
  {
    key: "Métricas semanales",
    matches: ["métricas semanales"],
    explanation:
      "Resumen semanal con el número de consultas y mensajes atendidos.",
  },
  {
    key: "Dashboard en vivo",
    matches: ["dashboard en vivo"],
    explanation: "Dashboard con estadísticas en tiempo real.",
  },
  {
    key: "Panel en vivo",
    matches: ["panel en vivo"],
    explanation: "Dashboard con estadísticas en tiempo real.",
  },
  {
    key: "Acceso cliente",
    matches: ["acceso cliente", "solo lectura"],
    explanation: "Rol de solo lectura para su equipo (no editan).",
  },
  {
    key: "Gestión de conexiones",
    matches: ["gestión de conexiones"],
    explanation:
      "Administra usted mismo sus canales de WhatsApp y Telegram.",
  },
  {
    key: "Tipo de respuestas",
    matches: ["tipo de respuestas"],
    explanation:
      "El motor que responde a sus clientes: programado por palabras clave (Básico) o inteligencia artificial con contexto (Profesional+).",
  },
  {
    key: "Inteligencia artificial",
    matches: ["inteligencia artificial", "ia personalizada"],
    explanation:
      "Un asistente que entiende el contexto de su negocio para responder preguntas que no están programadas.",
  },
  {
    key: "Precio",
    matches: ["precio", "proyectos desde"],
    explanation:
      "El costo mensual del plan, con facturación mensual y sin permanencia. Cancele cuando quiera.",
  },
  {
    key: "Soporte",
    matches: ["soporte"],
    explanation:
      "El nivel de acompañamiento y ayuda técnica que recibe, según su plan.",
  },
  {
    key: "Todo lo del plan anterior",
    matches: ["todo lo del plan"],
    explanation:
      "Este plan incluye todas las funciones del plan anterior, más las que se detallan a continuación.",
  },
  {
    key: "Atención fuera de horario",
    matches: ["fuera de horario"],
    explanation:
      "Su bot sigue atendiendo consultas y tomando pedidos aunque usted o su equipo estén fuera del horario de atención.",
  },
  {
    key: "Mensaje de bienvenida",
    matches: ["bienvenida"],
    explanation:
      "El primer mensaje automático que recibe su cliente al escribir, para saludarlo y orientarlo.",
  },
  {
    key: "Configuración",
    matches: ["configuración"],
    explanation: "El tiempo que tardamos en dejar su bot listo y funcionando.",
  },
  {
    key: "Asesoría a la medida",
    matches: ["asesoría"],
    explanation:
      "Le acompañamos para conectar el bot con sus sistemas actuales, ajustando la solución a su operación.",
  },
];

/** Returns the first term whose any match is a substring of `text` (case-insensitive). */
export function findPlanTerm(text: string): PlanTerm | undefined {
  const t = text.trim().toLowerCase();
  return planTerms.find((term) =>
    term.matches.some((m) => t.includes(m.toLowerCase())),
  );
}