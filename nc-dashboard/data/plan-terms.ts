/**
 * Plan term → short clarifying explanation (Spanish, tuteo, no voseo).
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
    matches: ["respuestas con ia", "respuestas ia"],
    explanation:
      "Mensajes respondidos por la inteligencia artificial con el contexto de tu negocio. Todos los planes incluyen IA, con un cupo mensual según el plan; las respuestas programadas (FAQ) y las escalaciones a un asesor no consumen tu cupo.",
  },
  {
    key: "Respuestas programadas (FAQ)",
    matches: ["programada", "faq"],
    explanation:
      "Respuestas automáticas por palabras clave y preguntas frecuentes. No consumen tu cupo de respuestas con IA.",
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
    explanation: "Rol de solo lectura para tu equipo (no editan).",
  },
  {
    key: "Gestión de conexiones",
    matches: ["gestión de conexiones"],
    explanation:
      "Administras tú mismo tus canales de WhatsApp y Telegram.",
  },
  {
    key: "Números de WhatsApp",
    matches: ["números de whatsapp", "números de wa", "whatsapp number"],
    explanation:
      "Cuántos números de WhatsApp puedes conectar para que el bot atienda consultas. La Prueba y Básico usan 1 número, Profesional incluye hasta 5 y Empresarial es ilimitado.",
  },
  {
    key: "Inteligencia artificial",
    matches: ["inteligencia artificial", "ia personalizada"],
    explanation:
      "Un asistente que entiende el contexto de tu negocio para responder preguntas que no están programadas.",
  },
  {
    key: "Precio",
    matches: ["precio", "proyectos desde"],
    explanation:
      "El costo mensual del plan, con facturación mensual y sin permanencia. Cancela cuando quieras.",
  },
  {
    key: "Soporte",
    matches: ["soporte"],
    explanation:
      "El nivel de acompañamiento y ayuda técnica que recibes, según tu plan.",
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
      "Tu bot sigue atendiendo consultas y tomando pedidos aunque tú o tu equipo estén fuera del horario de atención.",
  },
  {
    key: "Mensaje de bienvenida",
    matches: ["bienvenida"],
    explanation:
      "El primer mensaje automático que recibe tu cliente al escribir, para saludarlo y orientarlo.",
  },
  {
    key: "Configuración",
    matches: ["configuración"],
    explanation: "El tiempo que tardamos en dejar tu bot listo y funcionando.",
  },
  {
    key: "Asesoría a la medida",
    matches: ["asesoría"],
    explanation:
      "Te acompañamos para conectar el bot con tus sistemas actuales, ajustando la solución a tu operación.",
  },
];

/** Returns the first term whose any match is a substring of `text` (case-insensitive). */
export function findPlanTerm(text: string): PlanTerm | undefined {
  const t = text.trim().toLowerCase();
  return planTerms.find((term) =>
    term.matches.some((m) => t.includes(m.toLowerCase())),
  );
}