import type { DemoProfile } from "./types";

export const aestheticDefaultProfile: DemoProfile = {
  slug: "estetica",
  businessName: "Atelier Belle",
  brandAccent: "Estética Avanzada",
  categoryName: "Medicina Estética & Spa Facial",
  eyebrow: "Medicina Estética & Spa Facial",
  title: "Resultados naturales guiados por criterio médico y tecnología",
  subtitle:
    "Tratamientos faciales, corporales y medicina estética con protocolos personalizados para resaltar tu mejor versión sin perder tu esencia.",
  address: "Cl. 93b #11A-84, Chicó Norte, Bogotá",
  phone: "+57 (601) 845-9201",
  whatsappNumber: "573124932822",
  schedule: "Lun - Sáb: 8:00 AM - 7:00 PM",
  instagram: "@atelierbelle.bog",
  services: [
    {
      title: "Toxina Botulínica (Botox)",
      price: "Desde $650.000 COP",
      description: "Atenúa líneas de expresión en frente, entrecejo y patas de gallo conservando movilidad.",
    },
    {
      title: "Ácido Hialurónico Labios & Pómulos",
      price: "Desde $850.000 COP / jeringa",
      description: "Hidratación profunda, definición de contornos y armonización facial personalizada.",
    },
    {
      title: "Limpieza Facial Profunda con Hidrodermoabrasión",
      price: "$180.000 COP",
      description: "Extracción ultrasónica, peeling enzimático, hidratación con sérums activos y fototerapia LED.",
    },
    {
      title: "Bioestimuladores de Colágeno (Radiesse/Sculptra)",
      price: "Desde $1.400.000 COP",
      description: "Mejora la firmeza, elasticidad y calidad de la piel a mediano y largo plazo.",
    },
    {
      title: "Peeling Químico Médico",
      price: "$220.000 COP",
      description: "Renovación celular profunda para manchas, textura irregular y secuelas de acné.",
    },
    {
      title: "Lifting Facial Sin Cirugía (HIFU)",
      price: "Desde $950.000 COP",
      description: "Ultrasonido focalizado de alta intensidad para tensado facial y cuello.",
    },
  ],
  serviceChips: [
    "Toxina Botulínica",
    "Ácido Hialurónico",
    "Limpieza Profunda",
    "Bioestimuladores",
    "HIFU Lifting",
    "Peeling Químico",
  ],
  packages: [
    {
      name: "Glow & Detox",
      price: "$320.000 COP",
      description: "Ideal para preparar la piel antes de un evento o como mantenimiento mensual.",
      includes: [
        "Limpieza facial profunda ultrasónica",
        "Peeling enzimático suave",
        "Mascarilla hidratante de biocelulosa",
        "Terapia de luz LED reparadora",
      ],
      featured: false,
    },
    {
      name: "Armonización Full Face",
      price: "$2.100.000 COP",
      description: "El protocolo más solicitado para rejuvenecimiento global y natural.",
      includes: [
        "Valoración facial digital 3D",
        "Toxina botulínica en 3 zonas",
        "1 jeringa de ácido hialurónico premium",
        "Control médico y retoque a los 15 días",
      ],
      featured: true,
    },
    {
      name: "Protocolo Firmeza & Tono",
      price: "$1.650.000 COP",
      description: "Tratamiento intensivo para combatir flacidez y fotoenvejecimiento cutáneo.",
      includes: [
        "1 sesión de HIFU tercio medio e inferior",
        "1 vial de bioestimulador de colágeno",
        "Sérum post-tratamiento domiciliario",
      ],
      featured: false,
    },
  ],
  galleryImages: [
    "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1512290900672-1f4171804f32?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80",
  ],
  beforeAfterCases: [
    {
      title: "Armonización labial sutil",
      before: "Pérdida de volumen y asimetría en labio superior",
      after: "Definición de arco de cupido e hidratación natural con 1 ml",
    },
    {
      title: "Tratamiento de tercio superior",
      before: "Líneas de expresión marcadas en frente y entrecejo",
      after: "Mirada despejada y piel lisa manteniendo gestos espontáneos",
    },
    {
      title: "Tensado con bioestimulador",
      before: "Leve descolgamiento en surcos nasogenianos",
      after: "Recuperación de firmeza y luminosidad a los 45 días",
    },
  ],
  testimonials: [
    {
      name: "Valentina Morales",
      service: "Armonización Full Face",
      text: "Tenía mucho miedo de quedar con expresión congelada o labios exagerados. El resultado superó todo: me veo fresca y descansada.",
    },
    {
      name: "Dra. Claudia R.",
      service: "Bioestimulador Radiesse",
      text: "Como profesional de la salud soy exigente con la asepsia y la técnica. Todo el equipo es impecable y la atención automática por WhatsApp resolvió mis dudas.",
    },
    {
      name: "Santiago Peñuela",
      service: "Limpieza Profunda & Peeling",
      text: "Excelente experiencia. Pude reservar un sábado a las 11 PM por WhatsApp y en 3 minutos tenía todo confirmado sin esperar al lunes.",
    },
  ],
  faqs: [
    {
      question: "¿La primera cita de valoración tiene costo?",
      answer:
        "La valoración médica tiene un valor de $60.000 COP, los cuales se abonan en su totalidad al tratamiento si decides realizarlo el mismo día o dentro de los siguientes 30 días.",
    },
    {
      question: "¿Los tratamientos con toxina o rellenos duelen?",
      answer:
        "Aplicamos anestesia tópica de grado médico 25 minutos antes del procedimiento. La molestia es mínima y tolerable; la mayoría de pacientes describen una leve presión puntual.",
    },
    {
      question: "¿Cuánto tiempo dura el efecto de la toxina botulínica?",
      answer:
        "El efecto comienza a apreciarse entre el día 3 y 5, con resultado definitivo a los 15 días. Su duración promedio es de 4 a 6 meses según el metabolismo de cada paciente.",
    },
    {
      question: "¿Puedo retomar mis actividades inmediatamente después?",
      answer:
        "Sí. En procedimientos inyectables se sugiere evitar ejercicio intenso, saunas y frotarse la zona tratada durante las primeras 24 a 48 horas.",
    },
    {
      question: "¿Cómo funciona el agendamiento y confirmación de citas?",
      answer:
        "Puedes consultar disponibilidad y reservar las 24 horas a través de nuestro asistente de WhatsApp. Recibirás recordatorios automáticos con las indicaciones previas a tu cita.",
    },
  ],
  benefitBox: {
    eyebrow: "Experiencia Premium",
    title: "¿Primera vez con nosotros? Recibe un 15% de beneficio en tu primer protocolo",
    ctaText: "Solicitar protocolo y cita",
  },
};
