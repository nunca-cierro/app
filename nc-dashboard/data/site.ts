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
    "Cada demo incluye sitio web profesional + automatización por WhatsApp.",
  secondarySubtitle:
    "Combinamos diseño web con automatización inteligente para que cada negocio atienda 24/7 y nunca pierda un cliente.",
  imageAltPrefix: "Demo",
  whatsappMessageTemplate:
    "Hola, quiero un sitio + automatización similar al demo {demoName}. Quiero que mi negocio atienda 24/7.",
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
      "Te diseñamos un sitio con automatización WhatsApp a medida, con estructura de venta y branding sólido para que tu negocio nunca cierre.",
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
        "Todo incluido: inteligencia artificial, panel de control avanzado y múltiples negocios.",
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
    { label: "Métricas semanales", basic: "—", pro: "✅", enterprise: "✅" },
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
        "El Bot WhatsApp lo configuramos en 2 horas hábiles. Los planes más avanzados pueden tomar hasta una semana, dependiendo del sitio web.",
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
        "A partir del plan Profesional recibes estadísticas semanales con el número de consultas, horarios más activos y tipos de preguntas. En el plan Empresarial sumamos un panel en vivo con estadísticas detalladas.",
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

export const landingData = {
  hero: {
    sectionId: "inicio-landing",
    title: "Más clientes por WhatsApp con un sitio web para tu negocio",
    subtitle:
      "Te creamos un sitio web que lleva a tus clientes directo a WhatsApp para que te escriban, te pregunten y compren más rápido. Sin complicaciones.",
    cta: {
      primary: {
        label: "Quiero más clientes",
        href: "https://wa.me/573219615338?text=Hola%2C%20quiero%20m%C3%A1s%20clientes%20por%20WhatsApp%20para%20mi%20negocio.%20%C2%BFC%C3%B3mo%20empezamos%3F",
      },
      secondary: {
        label: "Ver cómo funciona",
        href: "#proceso-landing",
      },
    },
    disclaimer: [
      "✔ Simple y fácil de vender",
      "✔ Enfoque en mensajes y ventas",
      "✔ Sin complicarte con tecnología",
    ],
    stats: [
      { icon: "MessageCircle", title: "Más clientes" },
      { icon: "Zap", title: "Más mensajes" },
      { icon: "DollarSign", title: "Más ventas" },
      { icon: "MapPin", title: "Ubicación y contacto" },
    ],
  },

  services: {
    sectionId: "servicios-landing",
    label: "Servicios",
    title: "Un servicio simple para conseguir más clientes por WhatsApp",
    badge: "Incluido en todos los planes, sin costos ocultos.",
    services: [
      {
        icon: "Code",
        title: "Captación de clientes",
        description:
          "Creamos una oferta clara para que las personas interesadas te escriban por WhatsApp y pidan información de inmediato.",
      },
      {
        icon: "Zap",
        title: "Página optimizada para convertir",
        description:
          "Diseñamos un sitio web claro y directo, pensado para que cada visita se convierta en mensaje y posible venta.",
      },
      {
        icon: "Globe",
        title: "Integración directa con WhatsApp",
        description:
          "Todo queda preparado para que tus clientes te contacten en un clic, sin formularios largos ni pasos innecesarios.",
      },
    ],
  },

  process: {
    sectionId: "proceso-landing",
    label: "Proceso",
    title: "Así de simple empezamos",
    subtitle:
      "Cuatro pasos claros para que empieces a recibir más clientes lo antes posible.",
    stepLabelPrefix: "Paso",
    footerText:
      "Tendrás avances y versión de prueba para que lo revises antes de publicar.",
    steps: [
      {
        number: "01",
        title: "Analizamos tu negocio",
        description:
          "Revisamos qué vendes, a quién le vendes y qué tipo de clientes quieres atraer.",
      },
      {
        number: "02",
        title: "Te mostramos una demo",
        description:
          "Te presentamos una propuesta simple para que veas cómo llegaría la gente a tu WhatsApp.",
      },
      {
        number: "03",
        title: "Lo activamos",
        description:
          "Hacemos los ajustes finales y dejamos tu sitio listo para empezar a generar contactos.",
      },
      {
        number: "04",
        title: "Empiezas a recibir mensajes",
        description:
          "Tu negocio queda visible y preparado para que más personas te escriban por WhatsApp.",
      },
    ],
  },

  examples: {
    sectionId: "ejemplos-landing",
    label: "Ejemplos",
    title: "Así podría verse tu sitio web",
    subtitle: "Estos son ejemplos de sitios web que podemos hacer para tu negocio.",
    secondarySubtitle:
      "Creamos sitios web para negocios con enfoque en resultados, diseño profesional y contenido optimizado para atraer clientes.",
    imageAltPrefix: "Demo",
    whatsappMessageTemplate:
      "Hola, quiero un sitio web para mi negocio similar al demo {demoName}. Quiero un diseño profesional para mi marca.",
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
        "Te diseñamos un sitio a medida con estructura de venta, branding sólido y enfoque de resultados para tu negocio.",
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
          "Landing premium para reservas y pedidos directos por WhatsApp.",
        longDescription:
          "Diseño web profesional para restaurantes que quieren verse exclusivos, captar más reservas y convertir visitas en clientes con una experiencia clara desde celular.",
        features: ["Botón de WhatsApp", "Módulo de reservas", "Aparece en Google"],
      },
      {
        name: "Spa Serenity",
        category: "Spa",
        href: "/demo/spa",
        image:
          "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=80",
        shortDescription:
          "Web elegante que transmite confianza y aumenta solicitudes de cita.",
        longDescription:
          "Página orientada a tratamientos premium con bloques de servicios, testimonios y llamadas a la acción para generar más conversiones en negocios de bienestar.",
        features: ["Agenda por WhatsApp", "Sección de servicios", "Copy comercial"],
      },
      {
        name: "Gym Performance",
        category: "Gimnasio",
        href: "/demo/gym",
        image:
          "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=80",
        shortDescription:
          "Sitio de alto impacto para captar leads de clases y planes mensuales.",
        longDescription:
          "Ejemplo de sitio web profesional para gimnasios que necesitan más clientes, mejor posicionamiento y una propuesta clara para conseguir miembros.",
        features: ["Formulario de contacto", "Planes destacados", "Aparece en Google"],
      },
      {
        name: "Barbería Clásica",
        category: "Barbería",
        href: "/demo/barberia",
        image:
          "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1400&q=80",
        shortDescription:
          "Imagen sólida de marca para barberías que buscan vender más citas.",
        longDescription:
          "Demo de sitios web para negocios de barbería con identidad visual fuerte, acceso rápido a WhatsApp y estructura enfocada en cerrar clientes desde móvil.",
        features: ["Reserva rápida", "Galería de estilos", "Integración WhatsApp"],
      },
      {
        name: "Beauty Studio",
        category: "Belleza",
        href: "/demo/beauty",
        image:
          "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=1400&q=80",
        shortDescription:
          "Diseño aspiracional para salones que quieren elevar su percepción premium.",
        longDescription:
          "Propuesta de diseño web profesional para marcas de belleza que desean posicionarse con autoridad, mostrar resultados y generar más consultas.",
        features: ["Portafolio visual", "Botón de WhatsApp", "Se ve en celulares"],
      },
      {
        name: "Clínica Dental Pro",
        category: "Dental",
        href: "/demo/dental",
        image:
          "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1400&q=80",
        shortDescription:
          "Web confiable para clínicas que quieren más citas agendadas.",
        longDescription:
          "Ejemplo pensado para clínicas odontológicas que necesitan transmitir seguridad, explicar procedimientos y aumentar conversiones con una experiencia simple.",
        features: ["Agenda de citas", "Sección de tratamientos", "Aparece en Google"],
      },
    ],
  },

  pricing: {
    sectionId: "precios-landing",
    label: "Precios",
    title: "Planes claros para empezar hoy",
    subtitle:
      "Elige el plan según tu momento. Todos están enfocados en ayudarte a recibir más clientes por WhatsApp.",
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
        price: "Desde $700.000 COP",
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
        price: "Desde $1.000.000 COP",
        description:
          "Para negocios que quieren más visibilidad y más oportunidades de venta.",
        features: [
          "Página con más secciones",
          "Botón WhatsApp + llamada a la acción",
          "Optimización de mensajes y textos",
          "Hasta 2 correcciones de contenido",
          "Ideal para captar más clientes",
        ],
        featured: true,
      },
      {
        name: "Premium",
        price: "Desde $1.800.000 COP",
        description:
          "Para negocios que quieren una solución completa con acompañamiento.",
        features: [
          "Página completa con diseño exclusivo",
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
  },

  faq: {
    sectionId: "faq-landing",
    label: "Preguntas frecuentes",
    title: "Resolvemos tus dudas antes de empezar",
    subtitle: "Estas respuestas te ayudan a tomar una decisión informada y segura.",
    items: [
      {
        question: "¿Cuánto tarda la entrega?",
        answer:
          "Depende del plan y de la rapidez con la que recibamos tu información. En promedio, Básico se entrega rápido y los planes más completos requieren más iteraciones.",
      },
      {
        question: "¿Incluye dominio y alojamiento web?",
        answer:
          "No están incluidos por defecto para que mantengas el control total, pero podemos gestionarlo por ti como extra opcional.",
      },
      {
        question: "¿Puedo pagar por cuotas?",
        answer:
          "Sí. Podemos definir un esquema por etapas del proyecto para que avances con comodidad y claridad.",
      },
      {
        question: "¿Qué pasa si quiero agregar más secciones?",
        answer:
          "Lo podemos ampliar en cualquier momento. Te compartimos una propuesta adicional según el alcance nuevo.",
      },
      {
        question: "¿Puedo pedir cambios después de la entrega?",
        answer:
          "Sí. Cada plan incluye rondas de cambios y, luego de eso, puedes solicitar ajustes adicionales o contratar mantenimiento.",
      },
      {
        question: "¿Incluye posicionamiento en Google?",
        answer:
          "Todos los planes salen con una base optimizada. En el plan Profesional trabajamos posicionamiento básico en Google y en Premium un posicionamiento en Google desde el inicio.",
      },
    ],
  },

  contact: {
    sectionId: "contacto-landing",
    label: "Contacto",
    title: "Hablemos de tu negocio",
    subtitle:
      "Cuéntanos qué necesitas y te mostramos cómo un sitio web puede ayudarte a recibir más clientes por WhatsApp.",
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
    confidenceText:
      "Si no sabes qué plan elegir, te recomendamos el ideal según tu negocio.",
  },
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
