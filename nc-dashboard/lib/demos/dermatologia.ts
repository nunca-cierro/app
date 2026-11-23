import type { DemoProfile } from "./types";

export const dermatologiaProfile: DemoProfile = {
  slug: "dermatologia",
  businessName: "Clínica Dermatológica Dermis",
  brandAccent: "Dermatología Clínica & Láser",
  categoryName: "Dermatología Clínica, Quirúrgica & Estética",
  eyebrow: "Dermatología Médica & Tecnología Láser",
  title: "Salud y cuidado especializado para tu piel con respaldo médico",
  subtitle:
    "Diagnóstico y tratamiento de acné, manchas, rosácea, lunares y rejuvenecimiento con tecnología láser avanzada y dermatólogos certificados.",
  address: "Cl. 127 #19A-28, Consultorio 604, Edificio Acoce, Bogotá",
  phone: "+57 (601) 520-8910",
  whatsappNumber: "573124932822",
  schedule: "Lun - Sáb: 7:30 AM - 6:30 PM",
  instagram: "@dermis.dermatologia",
  services: [
    {
      title: "Consulta Dermatológica Especializada",
      price: "$160.000 COP",
      description: "Evaluación clínica completa de piel, pelo y uñas con dermatoscopia digital para diagnóstico preciso.",
    },
    {
      title: "Tratamiento Integral de Acné y Secuelas",
      price: "Desde $220.000 COP / sesión",
      description: "Protocolos médicos personalizados con peelings específicos, láser y terapia tópica u oral según el grado.",
    },
    {
      title: "Láser CO2 Fraccionado y Rejuvenecimiento",
      price: "Desde $780.000 COP",
      description: "Atenuación profunda de cicatrices, manchas y estimulación de colágeno con mínimo tiempo de recuperación.",
    },
    {
      title: "Retiro de Lunares, Queratosis y Biopsias",
      price: "Desde $180.000 COP",
      description: "Procedimiento menor ambulatorio con anestesia local, radiofrecuencia o escisión para estudio histopatológico.",
    },
    {
      title: "Mapeo Corporal de Lunares (Fotofinder)",
      price: "$320.000 COP",
      description: "Monitoreo dermatoscópico digital de lesiones pigmentadas para detección temprana y prevención de melanoma.",
    },
  ],
  serviceChips: [
    "Consulta Dermatológica",
    "Tratamiento de Acné",
    "Láser CO2",
    "Retiro de Lunares",
    "Mapeo de Lunares",
  ],
  packages: [
    {
      name: "Protocolo Anti-Acné 3 Sesiones",
      price: "$590.000 COP",
      description: "Plan intensivo para desinflamar brotes activos y limpiar impurezas profundas.",
      includes: [
        "Valoración médica dermatológica",
        "3 sesiones de limpieza médica y peeling dermatológico",
        "Protocolo domiciliario de cuidado cutáneo",
        "Control médico al mes",
      ],
      featured: false,
    },
    {
      name: "Renovación Cutánea Láser & Manchas",
      price: "$1.350.000 COP",
      description: "Nuestro tratamiento integral más recomendado para unificar el tono y tratar manchas rebeldes o cicatrices.",
      includes: [
        "Consulta de valoración y dermatoscopia",
        "1 sesión de Láser CO2 fraccionado facial completo",
        "1 sesión de plasma rico en plaquetas o bioestimulación",
        "Kit post-láser reparador dermatológico",
        "Control de evolución a los 15 días",
      ],
      featured: true,
    },
    {
      name: "Chequeo Preventivo de Piel Anual",
      price: "$290.000 COP",
      description: "Revisión preventiva de cuerpo completo para monitoreo de lunares y prevención de daño solar acumulado.",
      includes: [
        "Dermatoscopia digital completa",
        "Mapeo fotográfico de lesiones de riesgo",
        "Recomendación personalizada de fotoprotección",
        "Informe médico dermatológico",
      ],
      featured: false,
    },
  ],
  galleryImages: [
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1512290900672-1f4171804f32?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80",
  ],
  beforeAfterCases: [
    {
      title: "Tratamiento de acné inflamatorio y secuelas",
      before: "Brotes severos recurrentes en mejillas y pigmentación post-inflamatoria",
      after: "Piel desinflamada y textura lisa tras protocolo de 3 meses con dermatóloga",
    },
    {
      title: "Atenuación de melasma y manchas solares",
      before: "Manchas difusas en frente y pómulos resistentes a cremas comerciales",
      after: "Tono homogéneo y aclaramiento del 80% con láser y despigmentante médico",
    },
    {
      title: "Atenuación de cicatrices con láser CO2",
      before: "Cicatrices en picahielo y textura irregular post-acné",
      after: "Regeneración de colágeno y superficie cutánea visiblemente uniforme",
    },
  ],
  testimonials: [
    {
      name: "Laura Restrepo",
      service: "Protocolo Anti-Acné",
      text: "Había probado muchos productos sin éxito. La dermatóloga me dio un diagnóstico acertado y por WhatsApp coordiné todas mis sesiones sin esperas.",
    },
    {
      name: "Diego Cárdenas",
      service: "Láser CO2 Fraccionado",
      text: "El cambio en las cicatrices de mi rostro es impresionante. La explicación previa y el acompañamiento durante la recuperación fueron excelentes.",
    },
    {
      name: "Marcela Pardo",
      service: "Chequeo Preventivo de Lunares",
      text: "Me detectaron a tiempo una lesión dudosa en la espalda y la retiraron en consultorio el mismo día con anestesia local. Muy profesionales.",
    },
  ],
  faqs: [
    {
      question: "¿La consulta dermatológica incluye la fórmula médica?",
      answer:
        "Sí. Cada consulta incluye la valoración clínica completa, diagnóstico con dermatoscopia, prescripción médica oficial y recomendaciones de fotoprotección y rutina diaria.",
    },
    {
      question: "¿Cuánto tiempo toma la recuperación tras una sesión de láser CO2?",
      answer:
        "El enrojecimiento y microcostras duran entre 4 y 7 días. Durante ese periodo se indican cremas reparadoras y estricto uso de protector solar sin exposición directa.",
    },
    {
      question: "¿El retiro de lunares deja cicatriz?",
      answer:
        "Utilizamos técnicas quirúrgicas estéticas y radiofrecuencia para minimizar marcas. En la mayoría de casos la cicatriz es prácticamente imperceptible tras completar la cicatrización.",
    },
    {
      question: "¿Atienden pacientes de todas las edades?",
      answer:
        "Sí. Contamos con especialistas en dermatología pediátrica, del adolescente y del adulto para tratar dermatitis, eccemas, psoriasis y acné en cualquier etapa de la vida.",
    },
    {
      question: "¿Cómo se confirma la disponibilidad de citas?",
      answer:
        "Puedes consultar horarios y reservar directamente a través de nuestro asistente de WhatsApp las 24 horas, recibiendo la confirmación inmediata y recordatorio de tu cita.",
    },
  ],
  benefitBox: {
    eyebrow: "Valoración Dermatológica",
    title: "Agenda tu cita con un especialista en piel y recibe tu plan médico personalizado",
    ctaText: "Agendar cita dermatológica",
  },
};
