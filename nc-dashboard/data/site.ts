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
  title:
    "Atiende clientes 24/7 aunque estés durmiendo o cerrado con " + companyName,
  subtitle:
    "Automatizamos tu WhatsApp para que nunca pierdas un cliente. Responde preguntas, agenda citas y vende automáticamente — incluso cuando no estás.",
  cta: {
    primary: {
      label: "Quiero automatizar mi negocio",
      href: "https://wa.me/573219615338?text=Hola%2C%20quiero%20automatizar%20mi%20negocio%20con%20NuncaCierro.",
    },
    secondary: {
      label: "Ver servicios",
      href: "#servicios",
    },
  },
  disclaimer: [
    "✔ Responde automáticamente 24/7",
    "✔ Nunca pierdas un cliente",
    "✔ Sin conocimientos técnicos",
  ],
  stats: [
    {
      icon: "MdSmartToy",
      title: "24/7 Automático",
    },
    {
      icon: "MdWhatsapp",
      title: "Más clientes",
    },
    {
      icon: "MdAttachMoney",
      title: "Más ventas",
    },
    {
      icon: "MdFlashOn",
      title: "Sin esfuerzo",
    },
  ],
};

export const siteDevicePreview = {
  labels: {
    desktop: "PC",
    laptop: "Laptop",
    tablet: "Tablet",
    phone: "Celular",
  },
};

// Services section data
export const siteServices = {
  sectionId: "servicios",
  label: "Servicios",
  title: "Tu negocio atendiendo clientes sin que estés pendiente del celular",
  badge: "Sin conocimientos técnicos. Nosotros configuramos todo.",
  services: [
    {
      icon: "Bot",
      title: "Bot WhatsApp",
      description:
        "Responde automáticamente cuando preguntan por horarios, precios o ubicación. Atiende clientes aunque estés durmiendo, en reunión o de día libre. El cliente escribe 'menú' y recibe el catálogo al instante.",
    },
    {
      icon: "Sparkles",
      title: "Asistente Inteligente",
      description:
        "Agenda citas automáticas sin estar preguntando 'qué día te queda bien'. El bot hace seguimiento a clientes interesados que se enfriaron y recuerda citas automáticamente para que menos gente se desconecte.",
    },
    {
      icon: "LayoutDashboard",
      title: "Sistema Completo",
      description:
        "Página web profesional con tu marca + automatización completa de WhatsApp. Panel de control para ver cuántos clientes potenciales entraron, cuántos compraron y encuestas automáticas después de cada venta.",
    },
  ],
};

// Process section data
export const siteProcess = {
  sectionId: "proceso",
  label: "Proceso",
  title: "Así de simple empezamos",
  subtitle: "Tres pasos claros para que tu negocio empiece a atender 24/7.",
  stepLabelPrefix: "Paso",
  footerText: "Te mostramos avances y una versión de prueba antes de activar.",
  steps: [
    {
      number: "01",
      title: "Analizamos tu negocio",
      description:
        "Vemos qué preguntas recibes siempre, qué horario manejas y qué necesita automatizar tu negocio.",
    },
    {
      number: "02",
      title: "Configuramos el bot",
      description:
        "Personalizamos las respuestas, conectamos tu WhatsApp y dejamos todo listo para que empiece a funcionar.",
    },
    {
      number: "03",
      title: "Empiezas a recibir clientes 24/7",
      description:
        "Tu negocio nunca cierra. Los clientes te escriben, el bot responde y tú solo te encargas de vender.",
    },
  ],
};

// Header data layout
export const headerData = {
  brand: {
    name: "NC",
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
    { name: "Inicio", href: "#inicio" },
    { name: "Servicios", href: "#servicios" },
    { name: "Planes", href: "#planes" },
    { name: "Ejemplos", href: "#ejemplos" },
    { name: "Contacto", href: "#contacto" },
  ],
  mobileMenu: {
    openLabel: "Abrir menú",
    closeLabel: "Cerrar menú",
  },
  button: {
    label: "Asesoría gratis",
    href: "#contacto",
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
    { name: "Servicios", href: "#servicios" },
    { name: "Planes", href: "#planes" },
    { name: "Ejemplos", href: "#ejemplos" },
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
    privacy: {
      label: "Política de privacidad",
      href: "#",
    },
    terms: {
      label: "Términos de uso",
      href: "#",
    },
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
        "Responde automáticamente preguntas frecuentes",
        "Atiende clientes fuera de horario",
        "Mensaje de bienvenida personalizado",
        "Sin inteligencia artificial — solo respuestas programadas",
        "Hasta 500 respuestas al mes",
        "Configuración en 48 horas",
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
        "Inteligencia artificial (entiende contexto, responde aunque no sea una palabra clave)",
        "Respuestas ILIMITADAS",
        "Catálogo interactivo automático",
        "Hasta 3 negocios",
        "Estadísticas de uso semanales",
      ],
      featured: true,
    },
    {
      name: "Empresarial",
      type: "Empresarial",
      description:
        "Todo incluido: inteligencia artificial, panel de control, conexión personalizada y múltiples negocios.",
      features: [
        "Todo lo del Plan Profesional",
        "Negocios ILIMITADOS",
        "Panel de control web con métricas en vivo",
        "Conexión personalizada para integrar con tus sistemas",
        "Soporte prioritario 24/7",
        "Tiempo de respuesta garantizado",
      ],
      featured: false,
    },
  ],
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
        "No, todo lo contrario. Sigues recibiendo mensajes normal. El bot solo responde automáticamente preguntas frecuentes y fuera de horario. Cuando estés disponible, tomas el control cuando quieras.",
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
      href: "mailto:nicolasalbertov18@gmail.com",
      text: "nicolasalbertov18@gmail.com",
    },
    {
      icon: "MessageCircle",
      label: "WhatsApp",
      href: "https://wa.me/573219615338",
      text: "+57 3219615338",
    },
  ],
  quickResponseText: "Respuesta en menos de 2 horas (horario laboral)",
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
