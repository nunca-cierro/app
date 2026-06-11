// Nombre de la marca
export const companyName = "NuncaCierro";

export const siteMetadata = {
  lang: "es",
  title: "NuncaCierro | Automatización WhatsApp para negocios en Colombia",
  description:
    "Automatizamos tu WhatsApp para que respondas, agendes citas y vendas 24/7. Tu negocio nunca cierra. Ideal para restaurantes, clínicas, barberías, tiendas y más.",
  keywords:
    "automatización WhatsApp Colombia, chatbot WhatsApp negocio, atender WhatsApp automáticamente, bot WhatsApp pequeña empresa, agendar citas WhatsApp, clientes potenciales WhatsApp, nunca perder clientes WhatsApp, responder WhatsApp sin estar pendiente",
  preconnectUrls: ["https://images.unsplash.com"],
};

export const siteBanner = {
  message: "🤖 Atiende clientes 24/7 aunque estés durmiendo",
  messageMobile: "🤖 Atiende clientes 24/7",
  whatsappNumber: "573219615338",
  whatsappText:
    "Hola, quiero automatizar mi negocio con NuncaCierro.\n\nMi negocio es: ->\nEstoy ubicado en: ->\nMi mayor problema con los clientes es: ->",
  get whatsappUrl() {
    return `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(this.whatsappText)}`;
  },
  buttonLabel: "Quiero automatizar mi negocio",
  buttonLabelMobile: "Automatizar",
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
    logo: {
      src: "/Logonobg.png",
      alt: "NuncaCierro Logo",
      width: 112,
      height: 112,
      sizes: "112px",
    },
  },
  navItems: [
    { name: "Planes", href: "#planes" },
    { name: "Contacto", href: "#contacto" },
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
    { name: "Inicio", href: "#inicio" },
    { name: "Planes", href: "#planes" },
    { name: "FAQ", href: "#faq" },
    { name: "Contacto", href: "#contacto" },
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

// Examples section data
export const siteExamples = {
  sectionId: "ejemplos",
  label: "Ejemplos",
  title: "Así funciona con cada negocio",
  subtitle:
    "Cada demo incluye página web profesional + automatización por WhatsApp.",
  secondarySubtitle:
    "Combinamos diseño web con automatización inteligente para que cada negocio atienda 24/7 y nunca pierda un cliente.",
  imageAltPrefix: "Demo",
  whatsappMessageTemplate:
    "Hola, quiero una página + automatización similar al demo {demoName}. Quiero que mi negocio atienda 24/7.",
  buttons: {
    viewDemo: "Ver Demo",
    quoteSimilar: "Quiero una así",
    openDemo: "Abrir demo",
    quoteWhatsapp: "Cotizar por WhatsApp",
  },
  modal: {
    closeLabel: "Cerrar detalle",
    closeText: "Cerrar",
  },
  cta: {
    title: "¿Quieres una solución como estas?",
    description:
      "Te diseñamos una página con automatización WhatsApp a medida, con estructura de venta y branding sólido para que tu negocio nunca cierre.",
    buttonLabel: "Cotizar por WhatsApp",
  },
  demos: [
    {
      name: "Restaurante Élite",
      category: "Restaurante",
      href: "/demo/restaurant",
      image:
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=80",
      shortDescription:
        "Landing premium + bot para reservas y pedidos directos por WhatsApp 24/7.",
      longDescription:
        "Restaurante que atiende reservas automáticamente por WhatsApp, muestra el menú con solo pedirlo y capta clientes incluso cuando está cerrado.",
      features: [
        "Bot de reservas 24/7",
        "Menú automático por WhatsApp",
        "Página web profesional",
      ],
    },
    {
      name: "Spa Serenity",
      category: "Spa",
      href: "/demo/spa",
      image:
        "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=80",
      shortDescription:
        "Web elegante + bot que agenda citas y hace seguimiento automático de clientes.",
      longDescription:
        "Spa que agenda citas sin que la dueña esté pendiente, envía recordatorios automáticos y recupera clientes que preguntaron y no volvieron.",
      features: [
        "Agenda automática por WhatsApp",
        "Recordatorios de citas",
        "Página web elegante",
      ],
    },
    {
      name: "Gym Performance",
      category: "Gimnasio",
      href: "/demo/gym",
      image:
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=80",
      shortDescription:
        "Sitio de alto impacto + bot que capta clientes y responde planes automáticamente.",
      longDescription:
        "Gimnasio que responde automáticamente precios y horarios, capta clientes fuera de horario y agenda visitas de prueba sin intervención.",
      features: [
        "Captación de clientes 24/7",
        "Planes automáticos por WhatsApp",
        "Aparece en Google",
      ],
    },
    {
      name: "Barbería Clásica",
      category: "Barbería",
      href: "/demo/barberia",
      image:
        "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1400&q=80",
      shortDescription:
        "Imagen sólida de marca + bot que agenda turnos y recuerda citas automáticamente.",
      longDescription:
        "Barbería que agenda turnos por WhatsApp sin que el barbero tenga que dejar de trabajar, envía recordatorios y recupera clientes perdidos.",
      features: [
        "Agenda de turnos automática",
        "Recordatorios por WhatsApp",
        "Página web de marca",
      ],
    },
    {
      name: "Beauty Studio",
      category: "Belleza",
      href: "/demo/beauty",
      image:
        "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=1400&q=80",
      shortDescription:
        "Diseño aspiracional + bot que califica clientes y agenda citas automáticamente.",
      longDescription:
        "Salón de belleza que califica clientes automáticamente, agenda citas y envía promociones sin que la dueña tenga que estar al teléfono.",
      features: [
        "Clasificación automática de clientes",
        "Agenda inteligente",
        "Página web profesional",
      ],
    },
    {
      name: "Clínica Dental Pro",
      category: "Dental",
      href: "/demo/dental",
      image:
        "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1400&q=80",
      shortDescription:
        "Web confiable + bot que agenda citas y hace seguimiento post-consulta.",
      longDescription:
        "Clínica dental que agenda citas automáticamente, envía recordatorios y hace seguimiento post-consulta para mejorar la experiencia del paciente.",
      features: [
        "Agenda de citas automática",
        "Seguimiento después de la consulta",
        "Aparece en Google Maps",
      ],
    },
  ],
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
  guaranteeText:
    "Prueba el primer mes sin riesgo. Si no te gusta, lo cancelas y listo.",
  packages: [
    {
      name: "Básico",
      type: "Básico",
      description:
        "Automatiza las preguntas frecuentes de tus clientes. Ideal para negocios pequeños que empiezan.",
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
      description:
        "Todo incluido: inteligencia artificial, dashboard avanzado y múltiples negocios.",
      features: [
        "Todo lo del Plan Profesional",
        "Productos/servicios ilimitados en catálogo",
        "Conversaciones ilimitadas",
        "Negocios ilimitados",
        "Conexión personalizada para integrar con tus sistemas",
        "Soporte prioritario 24/7",
        "Tiempo de respuesta garantizado",
      ],
      featured: false,
    },
  ],
  // Comparison table rows (without prices)
  comparisonRows: [
    { label: "Tipo de respuestas", basic: "Programadas", pro: "IA", enterprise: "IA" },
    { label: "Productos/Servicios", basic: "Hasta 10", pro: "Hasta 50", enterprise: "Ilimitado" },
    { label: "Conversaciones al mes", basic: "500", pro: "5.000", enterprise: "Ilimitadas" },
    { label: "Negocios", basic: "1", pro: "3", enterprise: "Ilimitados" },
    { label: "Métricas semanales", basic: "✅", pro: "✅", enterprise: "✅" },
    { label: "Dashboard en vivo", basic: "—", pro: "✅", enterprise: "✅" },
    { label: "Acceso cliente", basic: "—", pro: "Solo lectura", enterprise: "Editar + agregar" },
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
      model: "llama-3.3-70b-versatile",
      maxTokens: 512,
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
      clientAccessType: "full",
      supportLevel: "priority_24_7",
      model: "llama-3.3-70b-versatile",
      maxTokens: 1024,
    },
  },
  trialInfo: {
    label: "Prueba gratis",
    description: "7 días de prueba con respuestas programadas, dashboard propio y acceso a conversaciones. Cancela cuando quieras.",
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
  items: [
    {
      question:
        "¿Qué pasa con mi WhatsApp cuando configuran el bot? ¿Dejo de recibir mensajes?",
      answer:
        "No, todo lo contrario. Sigues recibiendo mensajes normal. El bot solo responde automáticamente las preguntas frecuentes y los mensajes que llegan fuera de horario. Cuando estés disponible, tomas el control cuando quieras.",
    },
    {
      question: "¿El bot entiende lo que los clientes preguntan?",
      answer:
        "Sí, configuramos respuestas inteligentes para las preguntas más comunes de tu negocio: horarios, precios, ubicación, disponibilidad. Si alguien pregunta algo que el bot no sabe, te lo reenvía a ti.",
    },
    {
      question: "¿Puedo personalizar las respuestas?",
      answer:
        "Sí, tú defines los mensajes. Te damos una base y la ajustamos contigo hasta que suene exactamente como quieres. Con el tiempo puedes cambiarlas cuando quieras.",
    },
    {
      question: "¿Cuánto tiempo toma tenerlo listo?",
      answer:
        "El Bot WhatsApp lo configuramos en 48 horas hábiles. Los planes más avanzados pueden tomar hasta una semana, dependiendo de la landing page.",
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
        "En el plan Asistente Inteligente te enviamos estadísticas básicas semanales. En el Sistema Completo tienes un dashboard en vivo con métricas detalladas.",
    },
    {
      question: "¿Funciona para cualquier tipo de negocio?",
      answer:
        "Funciona para cualquier negocio que reciba consultas por WhatsApp: restaurantes, clínicas, barberías, tiendas, talleres, gimnasios, spas, dentistas. Si tu negocio recibe mensajes, te sirve.",
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

export const siteWhatsappFloat = {
  ariaLabel: "Contactar por WhatsApp",
  whatsappText:
    "Hola, vi NuncaCierro y quiero automatizar mi negocio.\n\nMi negocio es: \nCiudad: \n¿Qué problema tengo?: \n\n¿Qué información necesitas de mí?",
};

export const siteUi = {
  listBullet: "•",
  sheetCloseLabel: "Cerrar",
};
