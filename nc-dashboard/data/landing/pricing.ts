export const landingPricing = {
  sectionId: "precios",
  label: "Precios",
  title: "Planes claros para empezar hoy",
  subtitle:
    "Elige el plan según tu momento. Todos están enfocados en ayudarte a recibir más clientes con tu sitio web.",
  whatsappBaseUrl: "https://wa.me/573219615338?text=Me interesa el plan ",
  buttonText: "Quiero este plan",
  cardLabels: {
    default: "Plan",
    featured: "Plan recomendado",
    featuredBadge: "Más vendido",
  },
  footerText:
    "Precios de entrada para negocios locales. Podemos ajustarlo según lo que necesites.",
  guaranteeText:
    "Si no te gusta el diseño inicial, lo ajustamos hasta que te encante.",
  packages: [
    {
      name: "Básico",
      price: "Desde $699.900 COP",
      description:
        "Ideal para negocios que quieren un sitio web y empezar a recibir mensajes.",
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
      "Compara rápidamente el alcance y toma una decisión con claridad.",
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
    title: "Extras opcionales para potenciar tu negocio",
    subtitle: "Puedes agregarlos ahora o más adelante",
    itemLabel: "Complemento opcional",
    buttonText: "Agregar a mi plan",
    whatsappTextTemplate:
      "Hola, me interesa el extra {extraName}. Quisiera más información y el precio final.",
    items: [
      {
        name: "Dominio + Hosting Gestionado",
        icon: "🌐",
        description:
          "Asegura una base técnica confiable para que tu web se vea profesional desde el primer día.",
        includes: [
          "Dominio .com + alojamiento seguro",
          "Configuración completa para salir en línea sin fricción",
          "Soporte básico inicial para acompañar el arranque",
        ],
        price: "Desde $250.000 COP / año",
      },
      {
        name: "Mantenimiento y Soporte Mensual",
        icon: "🛠️",
        description:
          "Mantén tu sitio actualizado, seguro y ágil sin distraerte de la operación del negocio.",
        includes: [
          "Cambios pequeños de contenido cuando lo necesites",
          "Actualizaciones y seguridad para una web estable",
          "Soporte por WhatsApp con ajustes rápidos",
        ],
        price: "Desde $150.000 COP / mes",
      },
      {
        name: "Pack de Reels Publicitarios",
        icon: "🎬",
        description:
          "Contenido corto pensado para captar atención y reforzar tu presencia comercial en redes.",
        includes: [
          "3 a 5 videos verticales (15-30 segundos)",
          "Producción rápida con herramientas modernas (IA + edición)",
          "Texto promocional y edición dinámica lista para publicar",
        ],
        price: "Desde $450.000 COP",
      },
      {
        name: "Pack de Contenido para Redes Sociales",
        icon: "📣",
        description:
          "Publica con más consistencia y una imagen de marca clara para mejorar tu comunicación.",
        includes: [
          "10 diseños de posts listos para usar",
          "5 historias (stories) en formato de alto impacto",
          "Estilo de marca y textos listos para publicar",
        ],
        price: "Desde $350.000 COP",
      },
    ],
  },
  advisoryCta: {
    title:
      "Agenda una asesoría gratis por WhatsApp y te decimos qué plan te conviene.",
    description:
      "Te orientamos sin compromiso para que inviertas de forma inteligente y con objetivos claros.",
    buttonText: "Agendar asesoría gratis",
    whatsappText:
      "Hola, quiero agendar una asesoría gratis para saber qué plan web me conviene para mi negocio.",
  },
};
