import type { DemoProfile } from "./types";

export const botoshopProfile: DemoProfile = {
  slug: "botoshop",
  businessName: "Botoshop Medicina Estética",
  brandAccent: "Clínica & Armonización Facial",
  categoryName: "Medicina Estética & Procedimientos de Alto Ticket",
  eyebrow: "Clínica de Armonización Facial & Rejuvenecimiento",
  title: "Especialistas en toxina botulínica, ácido hialurónico y resultados armónicos",
  subtitle:
    "Protocolos médicos de alta precisión diseñados para rejuvenecer de manera sutil, elegante y natural. Atención personalizada y acompañamiento post-tratamiento continuo.",
  address: "Cra. 14 #85-68, Consultorio 502, Chicó, Bogotá",
  phone: "+57 (601) 912-3400",
  whatsappNumber: "573124932822",
  schedule: "Lun - Vie: 9:00 AM - 7:00 PM | Sáb: 8:00 AM - 4:00 PM",
  instagram: "@botoshop.med",
  services: [
    {
      title: "Toxina Botulínica (3 Zonas Completas)",
      price: "$750.000 COP",
      description: "Aplicación en frente, entrecejo y patas de gallo con marcas aprobadas por INVIMA y retoque incluido.",
    },
    {
      title: "Relleno y Perfilado de Labios",
      price: "$920.000 COP / jeringa",
      description: "Técnica rusa o clásica para hidratar, definir contorno y aportar volumen proporcional.",
    },
    {
      title: "Bioestimulador de Colágeno Sculptra / Radiesse",
      price: "$1.600.000 COP",
      description: "Inducción natural de colágeno tipo I y III para revertir flacidez y redensificar la piel.",
    },
    {
      title: "Armonización Mandibular & Mentón",
      price: "$1.350.000 COP",
      description: "Definición del óvalo facial y corrección de retrognatia leve con ácido hialurónico de alta reticulación.",
    },
    {
      title: "Rinomodelación Sin Cirugía",
      price: "$890.000 COP",
      description: "Rectificación de giba nasal y elevación de la punta nasal con resultados inmediatos.",
    },
    {
      title: "Valoración Facial Integral 3D",
      price: "$80.000 COP (Abonables)",
      description: "Diagnóstico fotográfico, análisis de proporciones y plan de tratamiento personalizado.",
    },
  ],
  serviceChips: [
    "Toxina Botulínica",
    "Ácido Hialurónico",
    "Bioestimuladores",
    "Perfilado de Labios",
    "Rinomodelación",
    "Valoración 3D",
  ],
  packages: [
    {
      name: "Protocolo Rejuvenece Full",
      price: "$2.450.000 COP",
      description: "Plan integral para rostro completo combinando relajación muscular y volumen estructural.",
      includes: [
        "Toxina botulínica en 3 zonas completas",
        "2 jeringas de ácido hialurónico Juvederm / Teosyal",
        "Valoración 3D y seguimiento a los 21 días",
        "Kit de cuidado dérmico domiciliario",
      ],
      featured: true,
    },
    {
      name: "Lift & Glow",
      price: "$1.850.000 COP",
      description: "Estimulación dérmica profunda para recuperar elasticidad, tersura y luminosidad.",
      includes: [
        "1 sesión de bioestimulador Radiesse o Sculptra",
        "1 sesión de skinbooster hidratante",
        "Mascarilla regeneradora post-procedimiento",
      ],
      featured: false,
    },
    {
      name: "Perfilado & Sonrisa",
      price: "$1.200.000 COP",
      description: "Combinación de hidratación labial y toxina para sonrisa gingival o código de barras.",
      includes: [
        "1 jeringa de ácido hialurónico en labios",
        "Toxina en puntos peribucales estratégicos",
        "Bálsamo regenerador con ácido hialurónico",
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
      title: "Toxina botulínica en tercio superior",
      before: "Marcación profunda en entrecejo y patas de gallo al sonreír",
      after: "Mirada relajada y descansada sin perder naturalidad a los 14 días",
    },
    {
      title: "Armonización de labios y mentón",
      before: "Perfil poco proyectado y labios deshidratados con falta de soporte",
      after: "Perfil armónico, proyección elegante y labios definidos",
    },
    {
      title: "Bioestimulador en tercio medio",
      before: "Pérdida de soporte malar y acentuación de surcos nasogenianos",
      after: "Efecto lifting sutil por producción propia de colágeno a las 8 semanas",
    },
  ],
  testimonials: [
    {
      name: "Dra. Camila Restrepo",
      service: "Protocolo Rejuvenece Full",
      text: "La precisión y ética del equipo de Botoshop es de otro nivel. Los resultados son tan naturales que la gente nota que me veo más joven pero nadie adivina qué me hice.",
    },
    {
      name: "Mariana Silva",
      service: "Toxina Botulínica 3 Zonas",
      text: "El proceso de agendar por el asistente de WhatsApp fue rapidísimo. Me recordó la cita, me dio las instrucciones previas y el control fue perfecto.",
    },
    {
      name: "Felipe Andrade",
      service: "Armonización Mandibular",
      text: "Tenía reservas por ser hombre, pero el resultado en la mandíbula es impecable y muy masculino. La atención médica genera total confianza.",
    },
  ],
  faqs: [
    {
      question: "¿Qué marcas de toxina botulínica y ácido hialurónico utilizan?",
      answer:
        "Trabajamos exclusivamente con marcas aprobadas por INVIMA y FDA de estándares internacionales: Botox (Allergan), Dysport (Galderma), Juvederm, Restylane y Teosyal.",
    },
    {
      question: "¿La cita de valoración incluye el tratamiento el mismo día?",
      answer:
        "Sí. Si tras la valoración médica estás de acuerdo con el plan propuesto y no existen contraindicaciones, el procedimiento se realiza en el mismo espacio y el valor de la valoración se abona al total.",
    },
    {
      question: "¿Cuánto dura la sesión y qué cuidados debo tener?",
      answer:
        "La mayoría de procedimientos duran entre 45 y 60 minutos. Recomendamos no acostarse en las 4 horas siguientes, evitar actividad física intensa por 24 horas y no masajear la zona tratada.",
    },
    {
      question: "¿Se nota que me hice un procedimiento estético?",
      answer:
        "Nuestra filosofía es la naturalidad. Diseñamos dosis exactas para suavizar el paso del tiempo y realzar tus rasgos sin rigidez ni sobrecorrecciones.",
    },
    {
      question: "¿Cómo puedo agendar o consultar disponibilidad de fechas?",
      answer:
        "Nuestro asistente automatizado en WhatsApp te muestra horarios disponibles en tiempo real, resuelve dudas sobre valores y confirma tu cita en minutos.",
    },
  ],
  benefitBox: {
    eyebrow: "Valoración Especial",
    title: "¿Quieres saber qué procedimiento es ideal para tu rostro? Agenda tu cita de valoración médica",
    ctaText: "Agendar valoración médica",
  },
};
