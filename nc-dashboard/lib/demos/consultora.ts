import type { DemoProfile } from "./types";

export const consultoraProfile: DemoProfile = {
  slug: "consultora",
  businessName: "Vanguardia Consultoría Empresarial",
  brandAccent: "Estrategia & Operaciones B2B",
  categoryName: "Consultoría Estratégica & Transformación Operativa",
  eyebrow: "Consultoría Estratégica & Optimización Operativa",
  title: "Estructura, eficiencia y escalabilidad para empresas en crecimiento",
  subtitle:
    "Optimizamos procesos, diagnósticos de rentabilidad y gobierno corporativo para consolidar el crecimiento sostenible de tu organización.",
  address: "Cra. 7 #71-21, Torre B, Piso 11, Zona Financiera, Bogotá",
  phone: "+57 (601) 745-3120",
  whatsappNumber: "573124932822",
  schedule: "Lun - Vie: 8:00 AM - 6:00 PM",
  instagram: "@vanguardiaconsultoria",
  services: [
    {
      title: "Diagnóstico de Rentabilidad y Procesos",
      price: "$2.800.000 COP",
      description: "Evaluación exhaustiva de costos, cuellos de botella operativos y márgenes por unidad de negocio.",
    },
    {
      title: "Plan Estratégico y Gobierno Corporativo",
      price: "Desde $5.200.000 COP",
      description: "Estructuración de comités directivos, hoja de ruta a 3 años y alineación de objetivos organizacionales.",
    },
    {
      title: "Optimización Comercial y Embudo B2B",
      price: "Desde $3.600.000 COP",
      description: "Estandarización de protocolos de venta, métricas clave de conversión y retención de cuentas clave.",
    },
    {
      title: "Rediseño de Procesos y Automatización",
      price: "Desde $4.100.000 COP",
      description: "Mapeo integral de flujos de trabajo, eliminación de tareas manuales y selección de herramientas de software.",
    },
    {
      title: "Mentoring Ejecutivo y Acompañamiento C-Level",
      price: "$3.200.000 COP/mes",
      description: "Sesiones quincenales de seguimiento directivo con socios fundadores y gerentes de área.",
    },
  ],
  serviceChips: [
    "Diagnóstico de Procesos",
    "Plan Estratégico",
    "Gobierno Corporativo",
    "Optimización Comercial",
    "Mentoring C-Level",
  ],
  packages: [
    {
      name: "Diagnóstico Express 360",
      price: "$2.800.000 COP",
      description: "Evaluación focalizada de 2 semanas para identificar fugas de rentabilidad y oportunidades inmediatas.",
      includes: [
        "Auditoría de flujos operativos clave",
        "Análisis de rentabilidad por producto/servicio",
        "Informe ejecutivo con plan de acción prioritario",
        "Sesión de entrega a socios y gerencia",
      ],
      featured: false,
    },
    {
      name: "Transformación Operativa 90 Días",
      price: "$8.900.000 COP",
      description: "Nuestro programa insignia para reestructurar la operación comercial y administrativa de la empresa.",
      includes: [
        "Diagnóstico profundo de toda la cadena de valor",
        "Rediseño e implementación de nuevos procesos",
        "Capacitación a líderes de equipo y manual de procedimientos",
        "Tablero de control e indicadores de gestión (KPIs)",
        "Acompañamiento semanal durante la transición",
      ],
      featured: true,
    },
    {
      name: "Retainer Estratégico Mensual",
      price: "$3.200.000 COP/mes",
      description: "Asesoría continua para juntas directivas y seguimiento a metas de expansión trimestrales.",
      includes: [
        "Participación en comités mensuales de dirección",
        "Revisión mensual de indicadores financieros y comerciales",
        "Resolución prioritaria de consultas estratégicas",
        "Soporte directo por canal exclusivo de dirección",
      ],
      featured: false,
    },
  ],
  galleryImages: [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80",
  ],
  beforeAfterCases: [
    {
      title: "Reestructuración operativa y margen comercial",
      before: "Procesos descentralizados y pérdida de visibilidad en rentabilidad por línea",
      after: "Estandarización de flujos y aumento del 18% en margen neto en 4 meses",
    },
    {
      title: "Digitalización del embudo B2B",
      before: "Prospección manual con ciclos de venta superiores a 90 días",
      after: "Ciclos reducidos a 35 días con calificación automática de leads",
    },
    {
      title: "Estructura de gobernanza y KPIs",
      before: "Dependencia operativa total del socio fundador",
      after: "Comité directivo autónomo guiado por tableros de gestión en tiempo real",
    },
  ],
  testimonials: [
    {
      name: "Carlos Mario Restrepo",
      service: "Transformación Operativa 90 Días",
      text: "Pasamos de apagar incendios todos los días a tener procesos claros y métricas que todo el equipo entiende. La coordinación inicial por WhatsApp fue impecable.",
    },
    {
      name: "Mariana Silva",
      service: "Diagnóstico Express 360",
      text: "En solo dos semanas identificamos tres áreas donde estábamos perdiendo margen. El retorno de inversión del diagnóstico fue inmediato.",
    },
    {
      name: "Andrés Felipe Gómez",
      service: "Retainer Estratégico Mensual",
      text: "Tener un consultor senior en nuestras juntas mensuales nos ha dado el foco necesario para abrir operaciones en Medellín y Cali sin descuidar Bogotá.",
    },
  ],
  faqs: [
    {
      question: "¿Cómo se define el alcance inicial de una consultoría?",
      answer:
        "Iniciamos con una sesión exploratoria de 30 minutos sin costo para conocer los desafíos de tu empresa. A partir de esa conversación elaboramos una propuesta técnica y económica adaptada.",
    },
    {
      question: "¿Trabajan bajo acuerdo de confidencialidad (NDA)?",
      answer:
        "Sí. Toda relación profesional y evaluación diagnóstica se ampara bajo un acuerdo de confidencialidad estricto antes de acceder a cualquier dato contable u operativo.",
    },
    {
      question: "¿Qué tipo de empresas atienden principalmente?",
      answer:
        "Nos especializamos en medianas empresas de servicios, tecnología, retail y manufactura con facturaciones consolidadas que buscan profesionalizar su gestión.",
    },
    {
      question: "¿Las sesiones son presenciales o virtuales?",
      answer:
        "Ofrecemos ambas modalidades. En Bogotá realizamos talleres y diagnósticos en las oficinas del cliente o en nuestras instalaciones, con soporte continuo virtual a nivel nacional.",
    },
    {
      question: "¿Cómo puedo agendar la sesión exploratoria inicial?",
      answer:
        "Puedes solicitarla directamente a través de nuestro asistente de WhatsApp. Te solicitará datos básicos de tu empresa y te asignará la franja disponible con un consultor senior.",
    },
  ],
  benefitBox: {
    eyebrow: "Sesión Diagnóstica Inicial",
    title: "Agenda una sesión exploratoria de 30 minutos sin costo para analizar tu modelo operativo",
    ctaText: "Agendar sesión exploratoria",
  },
};
