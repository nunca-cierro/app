export const siteMetadata = {
  lang: "es",
  title: "NuncaCierro | Automatización WhatsApp para negocios en Colombia",
  description:
    "Automatizamos tu WhatsApp para que respondas, agendes citas y vendas 24/7. Tu negocio nunca cierra. Ideal para restaurantes, clínicas, barberías, tiendas y más.",
  keywords:
    "automatización WhatsApp Colombia, chatbot WhatsApp negocio, atender WhatsApp automáticamente, bot WhatsApp pequeña empresa, agendar citas WhatsApp, clientes potenciales WhatsApp, nunca perder clientes WhatsApp, responder WhatsApp sin estar pendiente",
  preconnectUrls: ["https://images.unsplash.com"],
};

export const siteContactInfo = {
  whatsappNumber: "573219615338",
  whatsappText:
    "Hola, quiero automatizar mi negocio con NuncaCierro.\n\nMi negocio es: ->\nEstoy ubicado en: ->\nMi mayor problema con los clientes es: ->",
  get whatsappUrl() {
    return `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(this.whatsappText)}`;
  },
};

/** @deprecated Usar siteContactInfo en su lugar */
export const siteBanner = siteContactInfo;

export const siteWhatsAppMessages = {
  automation:
    "Hola, quiero información sobre los planes de automatización de WhatsApp.",
  landing:
    "Hola, quiero información sobre los precios de los sitios web.",
  get automationUrl() {
    return `https://wa.me/${siteContactInfo.whatsappNumber}?text=${encodeURIComponent(this.automation)}`;
  },
  get landingUrl() {
    return `https://wa.me/${siteContactInfo.whatsappNumber}?text=${encodeURIComponent(this.landing)}`;
  },
};

// Hero section data
export const siteHero = {
  sectionId: "inicio",
  title: "Clientes atendidos todo el tiempo.",
  subtitle:
    "Automatizamos tu WhatsApp para que tu negocio responda 24/7, tome pedidos, agende citas y nunca pierda ventas. Sin configuraciones técnicas.",
};

export const siteDevicePreview = {
  labels: {
    desktop: "PC",
    laptop: "Laptop",
    tablet: "Tablet",
    phone: "Celular",
  },
};

// Header data layout
export const headerData = {
  brand: {
    name: "NuncaCierro",
    accent: ".",
    href: "/",
  },
  navItems: [
    { name: "Inicio", href: "/" },
    { name: "Precios", href: "/precios" },
    { name: "Sitios web", href: "/inicio" },
    { name: "Contacto", href: "/#contacto" },
  ],
  mobileMenu: {
    openLabel: "Abrir menú",
    closeLabel: "Cerrar menú",
  },
  button: {
    label: "Escríbenos",
    href: "https://wa.me/573219615338",
  },
};

// Footer data layout
export const footerData = {
  brand: {
    name: "NuncaCierro",
    accent: ".",
    href: "/",
  },
  description: "Automatización WhatsApp para negocios en Colombia.",
  navItems: [
    { name: "Inicio", href: "/" },
    { name: "Precios", href: "/precios" },
    { name: "Sitios web", href: "/inicio" },
    { name: "Contacto", href: "/#contacto" },
  ],
  socialLinks: [
    {
      icon: "FaWhatsapp",
      label: "WhatsApp",
      href: "https://wa.me/573219615338",
    },
    {
      icon: "FaInstagram",
      label: "Instagram",
      href: "https://wa.me/573219615338",
    },
    {
      icon: "FaFacebook",
      label: "Facebook",
      href: "https://wa.me/573219615338",
    },
    {
      icon: "FaXTwitter",
      label: "X (Twitter)",
      href: "https://wa.me/573219615338",
    },
  ],
  copyright: {
    label: "Todos los derechos reservados.",
      legal: [
        { label: "Privacidad", href: "/legal#privacidad" },
        { label: "Términos", href: "/legal#terminos" },
        { label: "Datos y cumplimiento", href: "/legal#datos" },
      ],
  },
};

// Plans section data
export const sitePlans = {
  sectionId: "planes",
  label: "Planes",
  title: "Elige el plan según lo que necesite tu negocio",
  subtitle:
    "Todos incluyen configuración completa y soporte. Sin contratos largos. Cancela cuando quieras.",
  whatsappBaseUrl: "https://wa.me/573219615338?text=",
  buttonText: "Quiero este plan",
  cardLabels: {
    basic: "Básico",
    professional: "Profesional",
    enterprise: "Empresarial",
    featuredBadge: "Más elegido",
  },
  footerText:
    "Todos los planes se facturan mensualmente. Sin contratos largos, cancela cuando quieras.",
  // 2026-09 audit (C): the guarantee must match the REAL trial (7 días,
  // programado, sin IA) — no "primer mes sin riesgo" promise.
  guaranteeText:
    "7 días de prueba gratis con tu negocio real. Si no te convence, lo desactivamos y no pagas nada.",
  packages: [
    {
      name: "Básico",
      type: "Básico",
      price: "Desde $390.000/mes + IVA",
      description:
        "Automatiza las preguntas frecuentes de tus clientes. Ideal para negocios que están empezando a automatizar su atención.",
      features: [
        "Respuestas automáticas programadas por palabras clave",
        "Atiende clientes fuera de horario",
        "Mensaje de bienvenida personalizado",
        "Hasta 10 productos/servicios en catálogo",
        "Hasta 500 conversaciones al mes",
        "1 negocio",
        "Métricas semanales",
        "Configuración en 48 horas",
        "Soporte por WhatsApp",
      ],
      featured: false,
    },
    {
      name: "Profesional",
      type: "Profesional",
      price: "Desde $790.000/mes + IVA",
      description:
        "Inteligencia artificial que entiende lo que preguntan tus clientes. Para negocios con volumen constante.",
      features: [
        "Todo lo del Plan Básico",
        "Inteligencia artificial (entiende contexto)",
        "Respuestas ilimitadas",
        "Hasta 50 productos/servicios en catálogo",
        "Hasta 5.000 conversaciones al mes",
        "Hasta 3 negocios",
        "Dashboard en vivo con métricas",
        "Soporte por WhatsApp",
      ],
      featured: true,
    },
    {
      name: "Empresarial",
      type: "Empresarial",
      price: "Desde $1.590.000/mes + IVA",
      description:
        "Todo incluido: inteligencia artificial, panel de control avanzado y múltiples negocios.",
      features: [
        "Todo lo del Plan Profesional",
        "Productos/servicios ilimitados en catálogo",
        "Conversaciones ilimitadas",
        "Negocios ilimitados",
        // 2026-09 audit (E): integrations/SLA promises softened to what the
        // code backs — "asesoría para conectar" escalates to a human, no
        // guaranteed response times nor unconfirmed connectors.
        "Asesoría para conectar con tus sistemas (a la medida)",
        "Soporte prioritario 24/7",
      ],
      featured: false,
    },
    {
      name: "Corporativo",
      type: "Corporativo",
      price: "A cotizar",
      description:
        "Soluciones a la medida para operaciones grandes: múltiples negocios, IA personalizada y soporte dedicado.",
      features: [
        "Proyectos desde ~$3.500.000/mes + IVA",
        "Múltiples negocios y usuarios",
        "IA personalizada para tu operación",
        "Soporte dedicado y onboarding",
      ],
      featured: false,
    },
  ],
  // Comparison table rows (prices: Escenario A, copy strings)
  comparisonRows: [
    { label: "Precio", basic: "Desde $390.000/mes + IVA", pro: "Desde $790.000/mes + IVA", enterprise: "Desde $1.590.000/mes + IVA" },
    { label: "Tipo de respuestas", basic: "Programadas", pro: "IA", enterprise: "IA" },
    { label: "Productos/Servicios", basic: "Hasta 10", pro: "Hasta 50", enterprise: "Ilimitado" },
    { label: "Conversaciones al mes", basic: "500", pro: "5.000", enterprise: "Ilimitadas" },
    { label: "Negocios", basic: "1", pro: "3", enterprise: "Ilimitados" },
    { label: "Métricas semanales", basic: "—", pro: "✅", enterprise: "✅" },
    { label: "Dashboard en vivo", basic: "—", pro: "✅", enterprise: "✅" },
    { label: "Acceso cliente", basic: "—", pro: "Solo lectura", enterprise: "Solo lectura" },
    { label: "Soporte", basic: "WhatsApp", pro: "WhatsApp", enterprise: "Prioritario 24/7" },
  ],
  // Bot-readable plan info (no prices)
  planInfo: {
    basic: {
      name: "Básico",
      type: "programmed",
      maxProducts: 10,
      maxConversations: 500,
      maxBusinesses: 1,
      hasAI: false,
      hasDashboard: false,
      hasMetrics: true,
      hasClientAccess: false,
      supportLevel: "whatsapp",
    },
    professional: {
      name: "Profesional",
      type: "ai",
      maxProducts: 50,
      maxConversations: 5000,
      maxBusinesses: 3,
      hasAI: true,
      hasDashboard: true,
      hasMetrics: true,
      hasClientAccess: true,
      clientAccessType: "read",
      supportLevel: "whatsapp_email",
    },
    enterprise: {
      name: "Empresarial",
      type: "ai",
      maxProducts: null, // unlimited
      maxConversations: null, // unlimited
      maxBusinesses: null, // unlimited
      hasAI: true,
      hasDashboard: true,
      hasMetrics: true,
      hasClientAccess: true,
      clientAccessType: "read", // clients are read-only on ANY plan (CLIENT_VIEW_ONLY)
      supportLevel: "priority_24_7",
    },
  },
  trialInfo: {
    label: "Prueba gratis",
    description: "7 días de prueba con respuestas programadas, panel propio y acceso a conversaciones. Cancela cuando quieras.",
    days: 7,
    type: "programmed",
  },
  advisoryCta: {
    title: "¿No sabes qué plan elegir? Te orientamos sin compromiso.",
    description:
      "Te mostramos cómo funciona cada plan y te recomendamos el ideal para tu negocio.",
    buttonText: "Agendar asesoría gratis",
    whatsappText:
      "Hola, quiero agendar una asesoría gratis para saber qué plan de automatización me conviene para mi negocio.",
  },
};

// FAQ section data
export const siteFaq = {
  sectionId: "faq",
  label: "Preguntas frecuentes",
  title: "Todo lo que necesitas saber antes de empezar",
  subtitle:
    "Respondemos tus dudas para que tomes la mejor decisión sin vueltas.",
  // 2026-09 audit (F): the landing does NOT claim the "API oficial de Meta".
  // The real path is an Evolution API session (WhatsApp Web) — the FAQ below
  // describes it honestly and intentionally avoids any Meta Cloud API claim.
  items: [
    {
      question:
        "¿Qué pasa con mi WhatsApp cuando configuran el bot? ¿Dejo de recibir mensajes?",
      answer:
        "No, todo lo contrario. Sigues recibiendo mensajes normal. El bot responde automáticamente preguntas frecuentes y lo que no sabe te lo reenvía. Si un cliente necesita algo específico, lo deriva a tu WhatsApp para que tú lo resuelvas.",
    },
    {
      question: "¿El bot entiende lo que los clientes preguntan?",
      answer:
        "Sí, en todos los planes el bot responde automáticamente las preguntas más comunes de tu negocio: horarios, precios, ubicación, disponibilidad. A partir del plan Profesional, además entiende las preguntas en contexto con inteligencia artificial. Si algo queda fuera de su alcance, te lo reenvía para que lo resuelvas.",
    },
    {
      question: "¿Puedo personalizar las respuestas?",
      answer:
        "Sí, tú defines los mensajes. Te damos una base y la ajustamos contigo hasta que suene exactamente como quieres. Con el tiempo puedes cambiarlas cuando quieras.",
    },
    {
      question: "¿Cuánto tiempo toma tenerlo listo?",
      answer:
        "El bot de WhatsApp lo configuramos en 2 horas hábiles. Los planes más avanzados pueden tomar más tiempo según la complejidad de tu negocio.",
    },
    {
      question: "¿Necesito conocimientos técnicos para usarlo?",
      answer:
        "Para nada. Nosotros configuramos todo. Tú solo tienes que revisar los mensajes que te lleguen. Si necesitas cambiar algo, nos avisas y lo ajustamos.",
    },
    {
      question: "¿Puedo cancelar cuando quiera?",
      answer:
        "Sí, no hay contratos largos. Cancelas cuando quieras sin penalización. Obviamente esperamos que te quedes porque los resultados hablan solos.",
    },
    {
      question: "¿Cómo sé cuántos clientes me contactaron?",
      answer:
        "Todos los planes incluyen métricas semanales con el número de consultas, los horarios más activos y los tipos de preguntas. A partir del plan Profesional sumamos un panel en vivo con estadísticas detalladas.",
    },
    {
      question: "¿Funciona para cualquier tipo de negocio?",
      answer:
        "Funciona para cualquier negocio que reciba consultas por WhatsApp: restaurantes, clínicas, barberías, tiendas, talleres, gimnasios, spas, dentistas. Si tu negocio recibe mensajes, te sirve.",
    },
    {
      question: "¿Necesito WhatsApp Business o un número exclusivo para usarlo?",
      answer:
        "No, funciona con cualquier WhatsApp, incluso si es tu número personal. El bot se conecta como una sesión adicional de WhatsApp Web — tú sigues usando tu WhatsApp normal en el celular para hablar con amigos y familia sin problema. El bot responde automáticamente a los clientes, y si alguien pregunta algo que el bot no sabe, te lo reenvía a tu WhatsApp para que lo resuelvas. Si prefieres tener todo separado, puedes usar un chip prepago exclusivo para el negocio, pero no es obligatorio.",
    },
  ],
};

// Contact section data
export const siteContact = {
  sectionId: "contacto",
  label: "Contacto",
  title: "Hablemos de tu negocio",
  subtitle:
    "Cuéntanos qué necesitas y te mostramos cómo la automatización puede ayudarte a no perder más clientes.",
  contacts: [
    {
      icon: "Mail",
      label: "Correo",
      href: "mailto:soporte@nuncacierro.com",
      text: "soporte@nuncacierro.com",
    },
    {
      icon: "MessageCircle",
      label: "WhatsApp",
      href: "https://wa.me/573219615338",
      text: "+57 3219615338",
    },
  ],
  quickResponseText: "Respuesta inmediata — te leemos al instante",
  quoteChecklist: {
    icon: "🤖",
    title: "Para ayudarte más rápido, cuéntanos:",
    items: [
      {
        icon: "FaRegBuilding",
        text: "¿A qué se dedica tu negocio?",
      },
      {
        icon: "FaMapMarkerAlt",
        text: "¿En qué ciudad estás?",
      },
      {
        icon: "FaRegStar",
        text: "¿Qué preguntas recibes siempre por WhatsApp?",
      },
      {
        icon: "FaRegCalendarCheck",
        text: "¿Quieres agenda automática, catálogo o seguimiento?",
      },
    ],
  },
  footerText: "Te respondemos de lunes a viernes, de 9:00 a 18:00.",
  confidenceText: "Si no sabes qué plan elegir, te orientamos sin compromiso.",
};

// ============================================================
// LANDING PAGE SERVICE DATA (Páginas web con WhatsApp)
// ============================================================

// Secondary offer (web design) shown on the automation-first home — the web
// product is a separate, one-time-payment line (data/landing/pricing.ts), NOT
// part of the monthly SaaS. Price reference kept in sync with landingPricing.
export const siteWebSecondary = {
  label: "Sitios web",
  title: "¿También necesitas una página web profesional?",
  description:
    "Servicio aparte, con entrega única: diseñamos tu sitio para que más clientes lleguen por WhatsApp. Desde $699.900.",
  ctaLabel: "Ver planes de sitios web",
  href: "/inicio",
};

export const siteWhatsappFloat = {
  ariaLabel: "Contactar por WhatsApp",
  whatsappText:
    "Hola, vi NuncaCierro y quiero automatizar mi negocio.\n\nMi negocio es: \nCiudad: \n¿Qué problema tengo?: \n\n¿Qué información necesitas de mí?",
};

export const siteUi = {
  listBullet: "•",
  sheetCloseLabel: "Cerrar",
};

