export const siteMetadata = {
  lang: "es",
  title: "NuncaCierro | Automatización WhatsApp para negocios en Colombia",
  description:
    "Bot de WhatsApp para empresas en Colombia: automatización 24/7 que responde, agenda citas y vende mientras usted no está. 7 días de prueba gratis.",
  keywords:
    "bot WhatsApp empresas Colombia, automatización WhatsApp Colombia, atención al cliente 24/7 WhatsApp, agenda de citas WhatsApp, IA WhatsApp negocio",
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
  eyebrow: "Su negocio nunca cierra",
  title: "Atienda a sus clientes por WhatsApp 24/7",
  subtitle:
    "Automatizamos su WhatsApp para que su negocio responda 24/7, tome pedidos, agende citas y nunca pierda ventas. Sin configuraciones técnicas.",
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
    { name: "WhatsApp", href: "/" },
    { name: "Planes", href: "/#planes" },
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
    { name: "WhatsApp", href: "/" },
    { name: "Planes", href: "/#planes" },
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
  title: "Elija el plan según lo que necesite su negocio",
  subtitle:
    "Todos incluyen configuración completa y soporte. Sin contratos largos. Cancele cuando quiera.",
  whatsappBaseUrl: "https://wa.me/573219615338?text=",
  buttonText: "Quiero este plan",
  cardLabels: {
    basic: "Básico",
    professional: "Profesional",
    enterprise: "Empresarial",
    featuredBadge: "Más elegido",
  },
  footerText:
    "Todos los planes se facturan mensualmente. Sin contratos largos, cancele cuando quiera.",
  // 2026-09 audit (C): the guarantee must match the REAL trial (7 días,
  // programado, sin IA) — no "primer mes sin riesgo" promise.
  guaranteeText:
    "7 días de prueba gratis con su negocio real. Si no le convence, lo desactivamos y no paga nada. Durante la prueba, las respuestas son programadas (sin inteligencia artificial).",
  packages: [
    {
      name: "Básico",
      type: "Básico",
      price: "Desde $390.000/mes + IVA",
      description:
        "Automatiza las preguntas frecuentes de sus clientes. Ideal para negocios que están empezando a automatizar su atención.",
      features: [
        "Respuestas automáticas programadas por palabras clave (ilimitadas)",
        "Atiende clientes fuera de horario",
        "Mensaje de bienvenida personalizado",
        "Hasta 50 productos/servicios en catálogo",
        "1 negocio y 1 agente",
        "Métricas semanales (resumen por WhatsApp)",
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
        "Inteligencia artificial que entiende lo que preguntan sus clientes. Para negocios con volumen constante.",
      features: [
        "Todo lo del Plan Básico",
        "Inteligencia artificial (entiende contexto)",
        "Hasta 10.000 respuestas con IA al mes",
        "Hasta 200 productos/servicios en catálogo",
        "Hasta 5 negocios y 10 agentes",
        "Dashboard en vivo con métricas",
        "Gestión de conexiones WhatsApp + Telegram",
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
        "Respuestas con IA ilimitadas",
        "Negocios y agentes ilimitados",
        // 2026-09 audit (E): integrations/SLA promises softened to what the
        // code backs — "asesoría para conectar" escalates to a human, no
        // guaranteed response times nor unconfirmed connectors.
        "Asesoría para conectar con sus sistemas (a la medida)",
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
        "IA personalizada para su operación",
        "Soporte dedicado y onboarding",
      ],
      featured: false,
    },
  ],
  // Comparison table rows (prices: Escenario A, copy strings)
  comparisonRows: [
    { label: "Precio", basic: "Desde $390.000/mes + IVA", pro: "Desde $790.000/mes + IVA", enterprise: "Desde $1.590.000/mes + IVA" },
    { label: "Tipo de respuestas", basic: "Programadas (palabras clave + FAQ)", pro: "IA con contexto del negocio", enterprise: "IA con contexto del negocio" },
    { label: "Respuestas programadas (FAQ)", basic: "Ilimitadas", pro: "Ilimitadas", enterprise: "Ilimitadas" },
    { label: "Respuestas con IA al mes", basic: "—", pro: "10.000", enterprise: "Ilimitadas" },
    { label: "Productos/Servicios", basic: "Hasta 50", pro: "Hasta 200", enterprise: "Ilimitado" },
    { label: "Negocios", basic: "1", pro: "5", enterprise: "Ilimitados" },
    { label: "Agentes", basic: "1", pro: "10", enterprise: "Ilimitados" },
    { label: "Métricas semanales", basic: "Resumen por WhatsApp", pro: "✅", enterprise: "✅" },
    { label: "Dashboard en vivo", basic: "—", pro: "✅", enterprise: "✅" },
    { label: "Acceso cliente", basic: "—", pro: "Solo lectura", enterprise: "Solo lectura" },
    { label: "Soporte", basic: "WhatsApp", pro: "WhatsApp", enterprise: "Prioritario 24/7" },
  ],
  // Bot-readable plan info (no prices)
  planInfo: {
    basic: {
      name: "Básico",
      type: "programmed",
      maxProducts: 50,
      maxConversations: null,
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
      maxProducts: 200,
      maxConversations: 10000,
      maxBusinesses: 5,
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
    description: "7 días de prueba con respuestas programadas, panel propio y acceso a conversaciones. Cancele cuando quiera.",
    days: 7,
    type: "programmed",
  },
  advisoryCta: {
    title: "¿No sabe qué plan elegir? Le orientamos sin compromiso.",
    description:
      "Le mostramos cómo funciona cada plan y le recomendamos el ideal para su negocio.",
    buttonText: "Agendar asesoría gratis",
    whatsappText:
      "Hola, quiero agendar una asesoría gratis para saber qué plan de automatización me conviene para mi negocio.",
  },
};

// FAQ section data
export const siteFaq = {
  sectionId: "faq",
  label: "Preguntas frecuentes",
  title: "Todo lo que necesita saber antes de empezar",
  subtitle:
    "Respondemos sus dudas para que tome la mejor decisión sin vueltas.",
  // 2026-09 audit (F): the landing does NOT claim the "API oficial de Meta".
  // The real path is an Evolution API session (WhatsApp Web) — the FAQ below
  // describes it honestly and intentionally avoids any Meta Cloud API claim.
  items: [
    {
      question:
        "¿Qué pasa con mi WhatsApp cuando configuran el bot? ¿Dejo de recibir mensajes?",
      answer:
        "No, todo lo contrario. Sigue recibiendo mensajes normal. El bot responde automáticamente preguntas frecuentes y lo que no sabe se lo reenvía. Si un cliente necesita algo específico, lo deriva a su WhatsApp para que usted lo resuelva.",
    },
    {
      question: "¿El bot entiende lo que los clientes preguntan?",
      answer:
        "Sí, en todos los planes el bot responde automáticamente las preguntas más comunes de su negocio: horarios, precios, ubicación, disponibilidad. A partir del plan Profesional, además entiende las preguntas en contexto con inteligencia artificial. Si algo queda fuera de su alcance, se lo reenvía para que lo resuelva.",
    },
    {
      question: "¿Puedo personalizar las respuestas?",
      answer:
        "Sí, usted define los mensajes. Le damos una base y la ajustamos con usted hasta que suene exactamente como quiera. Con el tiempo puede cambiarlas cuando quiera.",
    },
    {
      question: "¿Cuánto tiempo toma tenerlo listo?",
      answer:
        "El bot de WhatsApp lo configuramos en 2 horas hábiles. Los planes más avanzados pueden tomar más tiempo según la complejidad de su negocio.",
    },
    {
      question: "¿Necesito conocimientos técnicos para usarlo?",
      answer:
        "Para nada. Nosotros configuramos todo. Usted solo tiene que revisar los mensajes que le lleguen. Si necesita cambiar algo, nos avisa y lo ajustamos.",
    },
    {
      question: "¿Puedo cancelar cuando quiera?",
      answer:
        "Sí, no hay contratos largos. Cancele cuando quiera sin penalización. Obviamente esperamos que se quede porque los resultados hablan solos.",
    },
    {
      question: "¿Cómo sé cuántos clientes me contactaron?",
      answer:
        "Todos los planes incluyen métricas semanales con el número de consultas y los mensajes atendidos. A partir del plan Profesional sumamos un panel en vivo con estadísticas detalladas.",
    },
    {
      question: "¿Funciona para cualquier tipo de negocio?",
      answer:
        "Funciona para cualquier negocio que reciba consultas por WhatsApp: restaurantes, clínicas, concesionarios, inmobiliarias, hoteles, gimnasios y spas. Si su negocio recibe mensajes, le sirve.",
    },
    {
      question: "¿Necesito WhatsApp Business o un número exclusivo para usarlo?",
      answer:
        "No, funciona con cualquier WhatsApp, incluso si es su número personal. El bot se conecta como una sesión adicional de WhatsApp Web — usted sigue usando su WhatsApp normal en el celular para hablar con amigos y familia sin problema. El bot responde automáticamente a los clientes, y si alguien pregunta algo que el bot no sabe, se lo reenvía a su WhatsApp para que lo resuelva. Si prefiere tener todo separado, puede usar un chip prepago exclusivo para el negocio, pero no es obligatorio.",
    },
  ],
};

// Contact section data
export const siteContact = {
  sectionId: "contacto",
  label: "Contacto",
  title: "Hablemos de su negocio",
  subtitle:
    "Cuéntenos qué necesita y le mostramos cómo la automatización puede ayudarle a no perder más clientes.",
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
  quickResponseText: "Respuesta inmediata — leemos su mensaje al instante",
  quoteChecklist: {
    icon: "🤖",
    title: "Para ayudarle más rápido, cuéntenos:",
    items: [
      {
        icon: "FaRegBuilding",
        text: "¿A qué se dedica su negocio?",
      },
      {
        icon: "FaMapMarkerAlt",
        text: "¿En qué ciudad está?",
      },
      {
        icon: "FaRegStar",
        text: "¿Qué preguntas recibe siempre por WhatsApp?",
      },
      {
        icon: "FaRegCalendarCheck",
        text: "¿Quiere agenda automática, catálogo o seguimiento?",
      },
    ],
  },
  footerText: "Le respondemos de lunes a viernes, de 9:00 a 18:00.",
  confidenceText: "Si no sabe qué plan elegir, le orientamos sin compromiso.",
};

// ============================================================
// LANDING PAGE SERVICE DATA (Páginas web con WhatsApp)
// ============================================================

// Secondary offer (web design) shown on the automation-first home — the web
// product is a separate, one-time-payment line (data/landing/pricing.ts), NOT
// part of the monthly SaaS. Price reference kept in sync with landingPricing.
export const siteWebSecondary = {
  label: "Sitios web",
  title: "¿También necesita una página web profesional?",
  description:
    "Servicio aparte, con entrega única: diseñamos su sitio para que más clientes lleguen por WhatsApp. Desde $699.900.",
  ctaLabel: "Ver planes de sitios web",
  href: "/inicio",
};

export const siteWhatsappFloat = {
  ariaLabel: "Contactar por WhatsApp",
  whatsappText:
    "Hola, vi NuncaCierro y quiero automatizar mi negocio.\n\nMi negocio es: \nCiudad: \n¿Qué problema tengo?: \n\n¿Qué información necesita de mí?",
};

export const siteUi = {
  listBullet: "•",
  sheetCloseLabel: "Cerrar",
};

