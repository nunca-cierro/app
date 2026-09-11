export const landingPricing = {
  sectionId: "precios",
  label: "Precios",
  title: "Planes claros para empezar hoy",
  subtitle:
    "Elija el plan según su momento. Todos están enfocados en ayudarle a recibir más clientes con su sitio web.",
  whatsappBaseUrl: "https://wa.me/573219615338?text=Me interesa el plan ",
  buttonText: "Quiero este plan",
  cardLabels: {
    default: "Plan",
    featured: "Plan recomendado",
    featuredBadge: "Más elegido",
  },
  footerText:
    "Cada plan es un pago único, sin mensualidades ni permanencia. Podemos ajustarlo según lo que necesite.",
  guaranteeText:
    "Si no le gusta el diseño inicial, lo ajustamos hasta que quede a su gusto.",
  packages: [
    {
      name: "Básico",
      price: "Desde $699.900 COP",
      description:
        "Ideal para negocios que quieren un sitio web profesional y empezar a recibir mensajes.",
      features: [
        "Sitio web adaptado a PC y Celular",
        "Botón WhatsApp integrado",
        "Hasta 2 correcciones de contenido",
        "Mensaje claro para vender",
      ],
      featured: false,
    },
    {
      name: "Profesional",
      price: "Desde $999.000 COP",
      description:
        "Para negocios que quieren más visibilidad y más oportunidades de venta.",
      features: [
        "Sitio con más secciones",
        "Botón WhatsApp + llamada a la acción",
        "Optimización de mensajes y textos",
        "Hasta 2 correcciones de contenido",
        "Ideal para captar más clientes",
      ],
      featured: true,
    },
    {
      name: "Premium",
      price: "Desde $1.799.000 COP",
      description:
        "Para negocios que quieren una solución completa con acompañamiento.",
      features: [
        "Sitio completo con diseño exclusivo",
        "Botón WhatsApp + enlaces directos",
        "Posicionamiento en Google",
        "Hasta 3 correcciones",
        "Acompañamiento y ajustes para mejorar resultados",
      ],
      featured: false,
    },
  ],
  comparison: {
    title: "¿Qué incluye cada plan?",
    subtitle:
      "Compare rápidamente el alcance y tome una decisión con claridad.",
    includedLabel: "Incluye",
    positiveLabel: "✔",
    negativeLabel: "—",
    rows: [
      { item: "Sitio web adaptado a PC y Celular", included: [true, true, true] },
      { item: "Botón WhatsApp integrado", included: [true, true, true] },
      { item: "Mensaje claro para vender", included: [true, true, true] },
      { item: "Optimización de mensajes", included: [false, true, true] },
      { item: "Más secciones en el sitio", included: [false, true, true] },
      { item: "Acompañamiento y ajustes", included: [false, false, true] },
    ],
  },
  optionalExtras: {
    title: "Extras opcionales para potenciar su negocio",
    subtitle: "Puede agregarlos ahora o más adelante",
    itemLabel: "Complemento opcional",
    buttonText: "Agregar a mi plan",
    whatsappTextTemplate:
      "Hola, me interesa el extra {extraName}. Quisiera más información y el precio final.",
    items: [
      {
        name: "Gestión de Dominio y Publicación",
        icon: "🌐",
        description:
          "Nos encargamos de publicar su sitio web y dejarlo funcionando con su dominio.",
        includes: [
          "Publicación del sitio en internet 24/7",
          "Conexión con su dominio .com (lo paga aparte)",
          "Configuración técnica completa para que esté en línea",
          "Sin que tenga que hacer nada técnico",
        ],
        price: "Desde $150.000 COP / año",
      },
      {
        name: "Mantenimiento y Soporte Mensual",
        icon: "🛠️",
        description:
          "Su sitio siempre actualizado y funcionando. Ideal si no quiere entrar en temas técnicos.",
        includes: [
          "Cambios de contenido cuando lo necesite (texto, imágenes)",
          "Supervisión de estabilidad y seguridad",
          "Soporte por WhatsApp con respuesta rápida",
        ],
        price: "Desde $180.000 COP / mes",
      },
    ],
  },
  advisoryCta: {
    title:
      "Agende una asesoría gratis por WhatsApp y le decimos qué plan le conviene.",
    description:
      "Le orientamos sin compromiso para que invierta de forma inteligente y con objetivos claros.",
    buttonText: "Agendar asesoría gratis",
    whatsappText:
      "Hola, quiero agendar una asesoría gratis para saber qué plan web me conviene para mi negocio.",
  },
};
