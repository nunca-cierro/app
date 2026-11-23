import type { DemoProfile } from "./types";

export const abogadosProfile: DemoProfile = {
  slug: "abogados",
  businessName: "Lex & Asociados Firma Jurídica",
  brandAccent: "Derecho Corporativo & Litigios",
  categoryName: "Firma de Abogados Especializados",
  eyebrow: "Asesoría Legal Corporativa & Solución de Controversias",
  title: "Protección jurídica estratégica para empresas, accionistas y patrimonios",
  subtitle:
    "Defensa en litigios comerciales, redacción de contratos, asesoría laboral empresarial y derecho societario con rigurosidad y respuesta oportuna.",
  address: "Cl. 72 #9-55, Piso 8, Centro Financiero, Bogotá",
  phone: "+57 (601) 321-7780",
  whatsappNumber: "573124932822",
  schedule: "Lun - Vie: 8:00 AM - 6:00 PM (Urgencias jurídicas 24/7 por WhatsApp)",
  instagram: "@lexasociados.legal",
  services: [
    {
      title: "Blindaje Contractual y Acuerdos Comerciales",
      price: "Desde $950.000 COP",
      description: "Elaboración, revisión y blindaje de contratos de prestación de servicios, distribución, suministro y acuerdos de confidencialidad.",
    },
    {
      title: "Derecho Laboral Empresarial y Liquidaciones",
      price: "Desde $850.000 COP",
      description: "Diseño de contratos laborales, reglamento interno de trabajo, procesos disciplinarios y prevención de demandas laborales.",
    },
    {
      title: "Derecho Societario y Acuerdos de Accionistas",
      price: "Desde $1.400.000 COP",
      description: "Estatutos a la medida, reformas societarias, acuerdos de accionistas con cláusulas de salida y resolución de conflictos entre socios.",
    },
    {
      title: "Litigios Comerciales, Civiles y Arbitraje",
      price: "Desde $2.500.000 COP",
      description: "Representación judicial ante juzgados civiles y tribunales de arbitramento en controversias contractuales e indemnizaciones.",
    },
    {
      title: "Registro de Marcas y Propiedad Intelectual",
      price: "Desde $1.100.000 COP",
      description: "Búsqueda de antecedentes marcarios, radicación de solicitud ante la Superintendencia de Industria y Comercio y defensa ante oposiciones.",
    },
  ],
  serviceChips: [
    "Blindaje Contractual",
    "Derecho Laboral",
    "Acuerdos de Socios",
    "Litigios y Arbitraje",
    "Registro de Marcas",
  ],
  packages: [
    {
      name: "Consulta Jurídica Especializada",
      price: "$350.000 COP",
      description: "Evaluación exhaustiva de tu caso con emisión de concepto jurídico escrito y hoja de ruta recomendada.",
      includes: [
        "Revisión previa de documentos relevantes",
        "Sesión de 60 minutos con abogado especialista",
        "Concepto legal formal y estrategia recomendada",
        "Abono total a honorarios si contratas el caso",
      ],
      featured: false,
    },
    {
      name: "Retainer Legal Corporativo",
      price: "$1.850.000 COP/mes",
      description: "Departamento jurídico tercerizado para pymes y empresas en crecimiento con necesidades continuas.",
      includes: [
        "Revisión ilimitada de contratos comerciales",
        "Conceptos laborales y acompañamiento en despidos",
        "Cobro prejudicial de cartera vencida",
        "Atención prioritaria y consultas directas por WhatsApp",
      ],
      featured: true,
    },
    {
      name: "Blindaje de Negocio y Societario",
      price: "$2.900.000 COP",
      description: "Estructuración integral para empresas en constitución o que reciben nuevos inversionistas.",
      includes: [
        "Redacción de acuerdo de accionistas personalizado",
        "Reforma estatutaria e inscripción en registro mercantil",
        "Contratos modelo laborales y de proveedores",
        "Solicitud de registro de 1 marca ante la SIC",
      ],
      featured: false,
    },
  ],
  galleryImages: [
    "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1479142506502-19b3a3b7ff33?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1521791055366-0d553872125f?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1589391886645-d51941baf7fb?auto=format&fit=crop&w=800&q=80",
  ],
  beforeAfterCases: [
    {
      title: "Resolución extrajudicial de controversia mercantil",
      before: "Riesgo inminente de demanda judicial por incumplimiento contractual de proveedor",
      after: "Acuerdo transaccional firmado en 3 semanas con recuperación del 92% del capital",
    },
    {
      title: "Blindaje contractual para ronda de inversión",
      before: "Estatutos estándar sin cláusulas de salida, vesting ni régimen de mayorías",
      after: "Acuerdo de socios robusto con mecanismos claros de protección a minoritarios",
    },
    {
      title: "Defensa y registro de marca ante la SIC",
      before: "Oposición formal interpuesta por un competidor alegando similitud fonética",
      after: "Contestación favorable de oposición y concesión definitiva del título marcario",
    },
  ],
  testimonials: [
    {
      name: "Fernando Beltrán",
      service: "Retainer Legal Corporativo",
      text: "Tener a Lex & Asociados como respaldo jurídico nos ha ahorrado problemas serios en contrataciones y negociaciones con clientes. Su respuesta por WhatsApp es ágil y precisa.",
    },
    {
      name: "Camila Osorio",
      service: "Blindaje de Negocio y Societario",
      text: "Estructuraron el ingreso de nuestros nuevos inversionistas con cláusulas claras de salida y protección de propiedad intelectual. Total tranquilidad.",
    },
    {
      name: "Gustavo Morales",
      service: "Registro de Marcas",
      text: "Nos defendieron ante una oposición infundada de otra empresa y logramos el registro de la marca. Muy profesionales en todo el trámite.",
    },
  ],
  faqs: [
    {
      question: "¿Cómo se maneja la confidencialidad de la información?",
      answer:
        "Toda consulta e información compartida está amparada por el secreto profesional legal y protegida bajo acuerdos formales de confidencialidad desde el primer contacto.",
    },
    {
      question: "¿Cobran por horas o con tarifa fija por proyecto?",
      answer:
        "Trabajamos principalmente bajo esquemas de tarifa fija por proyecto o planes mensuales de acompañamiento (retainer). De esta forma conoces con exactitud tus costos sin sorpresas.",
    },
    {
      question: "¿Tienen cobertura para trámites fuera de Bogotá?",
      answer:
        "Sí. Atendemos procesos y trámites judiciales y corporativos a nivel nacional gracias a la digitalización de la justicia y los sistemas de registro mercantil en Colombia.",
    },
    {
      question: "¿Qué debo presentar para la primera consulta jurídica?",
      answer:
        "Es conveniente enviar los documentos principales relacionados con tu caso (contratos, cartas o notificaciones) para que el abogado especialista prepare el análisis con anterioridad.",
    },
    {
      question: "¿Cómo se solicita la atención inmediata de un abogado?",
      answer:
        "Escribe a nuestro asistente por WhatsApp indicando el área legal (corporativo, laboral, marcas o litigios). Se te asignará de inmediato una cita con el especialista idóneo.",
    },
  ],
  benefitBox: {
    eyebrow: "Consulta Legal Especializada",
    title: "Evalúa la situación jurídica de tu empresa con un especialista en menos de 24 horas",
    ctaText: "Consultar con un abogado",
  },
};
