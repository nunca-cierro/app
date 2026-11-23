import type { DemoProfile } from "./types";

export const firmaContableProfile: DemoProfile = {
  slug: "firma-contable",
  businessName: "Alianza Contable & Tributaria",
  brandAccent: "Gestión Contable & Tributaria",
  categoryName: "Firma de Contadores Públicos & Revisoría Fiscal",
  eyebrow: "Servicios Contables, Fiscales & Nómina Electrónica",
  title: "Tranquilidad tributaria, contabilidad al día y cumplimiento normativo para tu empresa",
  subtitle:
    "Nos encargamos de tus declaraciones tributarias, estados financieros, nómina y planeación fiscal con estricto apego a las normas NIIF y la DIAN.",
  address: "Cl. 100 #8A-49, Oficina 502, Chicó Norte, Bogotá",
  phone: "+57 (601) 635-4420",
  whatsappNumber: "573124932822",
  schedule: "Lun - Vie: 8:00 AM - 5:30 PM (Consultas y recepción 24/7)",
  instagram: "@alianzacontable.co",
  services: [
    {
      title: "Outsourcing Contable Integral",
      price: "Desde $650.000 COP/mes",
      description: "Registro de movimientos, conciliaciones bancarias, emisión de balances mensuales y reportes NIIF para pymes.",
    },
    {
      title: "Planeación Tributaria & Declaración de Renta",
      price: "Desde $950.000 COP",
      description: "Preparación de IVA, retención en la fuente, ICA distrital, medios magnéticos y declaración de renta de personas jurídicas.",
    },
    {
      title: "Nómina Electrónica y Seguridad Social",
      price: "Desde $350.000 COP/mes",
      description: "Liquidación de salarios, prestaciones sociales, aportes a PILA y transmisión ante la DIAN sin contratiempos.",
    },
    {
      title: "Revisoría Fiscal y Auditoría Externa",
      price: "Desde $1.800.000 COP/mes",
      description: "Dictamen de estados financieros, verificación de control interno y cumplimiento estricto de obligaciones corporativas.",
    },
    {
      title: "Constitución de Empresas y Registro Mercantil",
      price: "Desde $750.000 COP",
      description: "Creación de SAS ante Cámara de Comercio, obtención de RUT definitivo, resolución de facturación electrónica y firmas digitales.",
    },
  ],
  serviceChips: [
    "Outsourcing Contable",
    "Planeación Tributaria",
    "Nómina Electrónica",
    "Revisoría Fiscal",
    "Constitución de SAS",
  ],
  packages: [
    {
      name: "Plan Pyme Esencial",
      price: "$650.000 COP/mes",
      description: "Ideal para empresas con hasta 100 transacciones mensuales que requieren libros al día y cumplimiento tributario básico.",
      includes: [
        "Contabilidad mensual en norma NIIF",
        "Presentación de impuestos mensuales (IVA, ReteFuente)",
        "Estados financieros trimestrales",
        "Soporte tributario por WhatsApp",
      ],
      featured: false,
    },
    {
      name: "Plan Corporativo Integral",
      price: "$1.450.000 COP/mes",
      description: "Nuestra solución completa para empresas medianas con empleados, facturación constante y múltiples obligaciones.",
      includes: [
        "Outsourcing contable sin límite de asientos",
        "Nómina electrónica hasta 15 colaboradores",
        "Informes magnéticos distritales y nacionales",
        "Estados financieros mensuales con análisis de variaciones",
        "Reunión mensual de revisión con contador sénior",
      ],
      featured: true,
    },
    {
      name: "Blindaje Tributario Anual",
      price: "$2.600.000 COP",
      description: "Auditoría preventiva antes del cierre de año para optimizar la carga impositiva legítima y blindar ante fiscalizaciones de la DIAN.",
      includes: [
        "Auditoría fiscal de periodos abiertos",
        "Depuración de cuentas y saldos inconsistentes",
        "Proyección de renta y deducciones fiscales aplicables",
        "Acompañamiento ante posibles requerimientos oficiales",
      ],
      featured: false,
    },
  ],
  galleryImages: [
    "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1551836022-4c4c79ecde51?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=800&q=80",
  ],
  beforeAfterCases: [
    {
      title: "Regularización tributaria y cierre contable",
      before: "Retrasos de 6 meses en libros y requerimientos pendientes ante la DIAN",
      after: "Contabilidad al día en 30 días y respuesta favorable sin sanciones económicas",
    },
    {
      title: "Planeación fiscal para grupo empresarial",
      before: "Carga tributaria ineficiente y saldos a favor estancados durante dos periodos",
      after: "Optimización fiscal legítima y recuperación efectiva de saldos a favor",
    },
    {
      title: "Migración y automatización de nómina",
      before: "Liquidaciones en hojas de cálculo propensas a errores en prestaciones sociales",
      after: "Emisión electrónica 100% automatizada con certificados inmediatos",
    },
  ],
  testimonials: [
    {
      name: "Patricia Henao",
      service: "Plan Corporativo Integral",
      text: "Tener la contabilidad y nómina centralizada con ellos nos quitó un dolor de cabeza enorme. La atención por WhatsApp para resolver dudas de retenciones es inmediata.",
    },
    {
      name: "Javier Mendoza",
      service: "Regularización Tributaria",
      text: "Teníamos dos declaraciones atrasadas con riesgo de sanción. Lo solucionaron en una semana con total transparencia en los costos.",
    },
    {
      name: "Esteban Rueda",
      service: "Constitución de SAS",
      text: "Excelente servicio para crear nuestra empresa. Nos guiaron paso a paso con el RUT, facturación y la cuenta bancaria sin demoras.",
    },
  ],
  faqs: [
    {
      question: "¿Con qué software contable trabajan?",
      answer:
        "Trabajamos con las plataformas líderes del mercado como Siigo, World Office, Alegra y SAP Business One. Si ya cuentas con un sistema nos adaptamos a él, o te sugerimos el más eficiente para tu volumen.",
    },
    {
      question: "¿Qué sucede si mi empresa tiene declaraciones pendientes de años anteriores?",
      answer:
        "Realizamos una auditoría preliminar para calcular extemporaneidades y sanciones mínimas, aplicando las reducciones normativas vigentes del Estatuto Tributario para regularizar tu situación cuanto antes.",
    },
    {
      question: "¿Incluyen el soporte en caso de requerimientos de la DIAN?",
      answer:
        "Sí. Todos nuestros planes corporativos incluyen la respuesta técnica a requerimientos ordinarios de información, inspecciones tributarias y solicitudes de corrección emitidas por la DIAN o secretarías de hacienda.",
    },
    {
      question: "¿Cómo se coordina el envío de facturas y documentos?",
      answer:
        "Dispones de una carpeta compartida en la nube y recepción automatizada por WhatsApp y correo electrónico, eliminando la necesidad de traslados físicos de documentos.",
    },
    {
      question: "¿Cómo puedo solicitar una cotización formal para mi empresa?",
      answer:
        "Escríbenos por WhatsApp. Nuestro asistente recopilará el número aproximado de transacciones y empleados para generarte una propuesta detallada en minutos.",
    },
  ],
  benefitBox: {
    eyebrow: "Diagnóstico Fiscal Preventivo",
    title: "Revisamos el estado tributario y contable de tu empresa sin costo ni compromiso",
    ctaText: "Solicitar diagnóstico contable",
  },
};
