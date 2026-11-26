"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Award,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock,
  Globe,
  GraduationCap,
  MapPin,
  Menu,
  MessageCircle,
  Mic,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  ArrowRight,
  Layers,
} from "lucide-react";
import {
  DemoChatWidget,
  type DemoBotReply,
  type DemoServiceItem,
  type DemoFaqItem,
} from "@/components/demo/demo-chat-widget";

const imageLoader = ({ src }: { src: string }) => src;

const WHATSAPP_NUMBER = "573115503372";
const ADDRESS = "Carrera 13 # 58-44, Chapinero, Bogotá, Colombia (Parqueadero para motos)";
const SCHEDULE = "Horarios flexibles e híbridos · Sede Chapinero y Online en vivo";

const NAV_LINKS = [
  { label: "Inicio", id: "inicio" },
  { label: "Metodología CPE", id: "metodologia" },
  { label: "Programas", id: "programas" },
  { label: "Test de Nivel", id: "test-nivel" },
  { label: "Preguntas", id: "objeciones" },
  { label: "Contacto", id: "contacto" },
];

const LANGUAGES = [
  { name: "Inglés", tag: "Principal", desc: "Desde A1 hasta C1 con enfoque conversacional y certificación internacional." },
  { name: "Portugués", tag: "Principal", desc: "Ideal para negocios en Latinoamérica, viajes y oportunidades laborales." },
  { name: "Francés", tag: "Principal", desc: "Preparación para becas, estudios en el exterior y dominio profesional." },
  { name: "Italiano, Alemán y Ruso", tag: "Adicionales", desc: "Programas especializados para movilidad académica, becas DAAD y cultura." },
];

const LEVELS = [
  { code: "A1", name: "Principiante", detail: "Desde cero, sin bases previas" },
  { code: "A2", name: "Básico", detail: "Comunicación cotidiana y fluida" },
  { code: "B1", name: "Intermedio", detail: "Autonomía en viajes y trabajo" },
  { code: "B2", name: "Intermedio Alto", detail: "Nivel ideal para becas y empresas" },
  { code: "C1", name: "Avanzado", detail: "Dominio ejecutivo y académico" },
];

const PROGRAMS: DemoServiceItem[] = [
  {
    title: "Programa Basic",
    description: "Bases sólidas desde cero con comprensión lógica y práctica guiada desde el primer día.",
  },
  {
    title: "Programa College",
    description: "Enfocado en universitarios, requisitos de grado y proyección académica internacional.",
  },
  {
    title: "Personal Experience",
    description: "Acompañamiento personalizado 1 a 1 totalmente adaptado a tus metas, ritmo y agenda.",
  },
  {
    title: "Programa Prime",
    description: "Inmersión integral con salas temáticas, Speak Easy Club y refuerzos ilimitados.",
  },
  {
    title: "Programa para Compañías (B2B)",
    description: "Capacitación corporativa a la medida para equipos que requieren dominio real en negocios.",
  },
  {
    title: "Programa para Instituciones",
    description: "Alianzas educativas y preparación oficial orientada a exámenes TOEIC y TOEFL.",
  },
];

const MODALITIES = [
  { title: "Presencial", detail: "Sede Chapinero (Cra. 13 # 58-44) con salas temáticas y parqueadero para motos." },
  { title: "Online en vivo", detail: "Clases interactivas en directo desde cualquier lugar, con docentes certificados." },
  { title: "Híbrida y flexible", detail: "Combina sesiones presenciales y virtuales sin horario semanal rígido." },
  { title: "Personalizado 1 a 1", detail: "Plan diseñado a tu medida con horario exclusivo y avance acelerado." },
  { title: "Empresas y Organizaciones", detail: "Formación corporativa enfocada en productividad, ventas y reportes globales." },
  { title: "Solicitudes Internacionales", detail: "Preparación estratégica para empleo exterior y becas Fulbright, Chevening y DAAD." },
];

const OBJECTIONS: DemoFaqItem[] = [
  {
    question: "¿Y si no tengo bases en inglés?",
    answer:
      "Nuestros programas inician completamente desde cero (nivel A1) y no requieren experiencia previa. Con el pilar de Comprensión entiendes la lógica del idioma desde el primer día.",
  },
  {
    question: "¿Realmente voy a poder hablar con fluidez?",
    answer:
      "Sí. Nuestra Metodología CPE se enfoca en conversación práctica desde el día 1, evitando la memorización mecánica. Además cuentas con nuestro Speak Easy Club y salas temáticas para practicar en entornos reales.",
  },
  {
    question: "¿Y si no tengo tiempo fijo cada semana?",
    answer:
      "Contamos con modalidades híbridas y horarios flexibles que no exigen un horario rígido semanal en varios de nuestros programas, permitiéndote avanzar a tu propio ritmo.",
  },
  {
    question: "¿Y si ya intenté en otro lado y no funcionó?",
    answer:
      "A diferencia de los métodos tradicionales basados en teoría, aplicamos la Metodología CPE (Comprensión, Producción y Experiencia) con refuerzos ilimitados y acompañamiento constante de nuestro equipo.",
  },
  {
    question: "¿Cuáles son los precios de los programas?",
    answer:
      "No manejamos tarifas genéricas únicas porque cada ruta se adapta a tu objetivo, idioma, nivel actual y modalidad. Realiza el test de nivel gratis o escríbenos por WhatsApp para orientarte con el plan ideal.",
  },
];

const QUICK_QUESTIONS = [
  "¿Cuánto cuesta el curso de inglés?",
  "No tengo bases en inglés, ¿puedo empezar?",
  "Quiero hacer el test de nivel gratis",
  "¿Cómo funciona la metodología CPE y horarios?",
];

function experiencePrimeBotReply(userQuery: string): DemoBotReply | null {
  const lower = userQuery.toLowerCase().trim();
  const waBase = `https://wa.me/${WHATSAPP_NUMBER}?text=`;

  // 1. Lead enviado desde formulario o mensaje con datos
  if (
    lower.includes("mi nombre es") ||
    lower.includes("me llamo") ||
    lower.includes("solicito orientación") ||
    /\d{7,12}/.test(lower)
  ) {
    return {
      reply:
        "Excelente, ya recibimos tu perfil en Experience Prime. Con esa información un asesor académico te orientará sobre el programa ideal (Basic, College, Prime o 1 a 1) y te enviará el acceso al Test de Nivel Gratis (20 preguntas, 5-7 min) para revisar tu Speaking.",
      action: {
        type: "whatsapp",
        label: "Continuar asesoría por WhatsApp",
        url: `${waBase}${encodeURIComponent(`Hola Experience Prime, quiero iniciar mi proceso: ${userQuery}`)}`,
      },
    };
  }

  // 2. Test de nivel gratis
  if (
    lower.includes("test") ||
    lower.includes("prueba") ||
    lower.includes("diagnostico") ||
    lower.includes("diagnóstico") ||
    lower.includes("nivel")
  ) {
    return {
      reply:
        "Nuestro Test de Nivel Gratis online toma solo 5 a 7 minutos (20 preguntas de Grammar, Vocabulary, Reading y Listening) y luego un miembro del equipo revisa tu Speaking. Para enviarte el acceso y orientarte mejor, dime tu nombre, teléfono (+57) y qué idioma te interesa (Inglés, Portugués o Francés).",
    };
  }

  // 3. Precios / Costos / Tarifas
  if (
    lower.includes("precio") ||
    lower.includes("costo") ||
    lower.includes("cuanto") ||
    lower.includes("cuánto") ||
    lower.includes("vale") ||
    lower.includes("tarifa") ||
    lower.includes("cotiz")
  ) {
    return {
      reply:
        "En Experience Prime no publicamos tarifas rígidas porque adaptamos tu plan según tu objetivo (empleo, becas Fulbright/Chevening/DAAD, viajes o negocios), el idioma y la modalidad (Presencial Chapinero, Online en vivo, Híbrida o 1 a 1). ¿Qué idioma te gustaría estudiar y qué modalidad prefieres?",
    };
  }

  // 4. Sin bases / Desde cero
  if (
    lower.includes("sin bases") ||
    lower.includes("no tengo bases") ||
    lower.includes("desde cero") ||
    lower.includes("principiante") ||
    lower.includes("nunca he")
  ) {
    return {
      reply:
        "No te preocupes, puedes iniciar completamente desde cero en nivel A1 sin experiencia previa. Desde el día 1 trabajamos comprensión lógica y conversación guiada, con refuerzos ilimitados para que avances con seguridad. ¿Prefieres modalidad presencial en Chapinero, online en vivo o híbrida?",
    };
  }

  // 5. Metodología CPE / Speak Easy / Fluidez / Ya intenté
  if (
    lower.includes("cpe") ||
    lower.includes("metodolog") ||
    lower.includes("fluidez") ||
    lower.includes("hablar") ||
    lower.includes("speak easy") ||
    lower.includes("otro lado")
  ) {
    return {
      reply:
        "Nuestra Metodología CPE se basa en 3 pilares: Comprensión (lógica desde el día 1), Producción (hablar sin memorización) y Experiencia (salas temáticas y Speak Easy Club), respaldado con refuerzos ilimitados. ¿Te gustaría hacer el Test de Nivel gratis de 5 minutos para recomendarte tu ruta?",
    };
  }

  // 6. Horarios y Modalidades
  if (
    lower.includes("horario") ||
    lower.includes("tiempo") ||
    lower.includes("modalidad") ||
    lower.includes("online") ||
    lower.includes("hibrid") ||
    lower.includes("híbrid") ||
    lower.includes("presencial") ||
    lower.includes("1 a 1")
  ) {
    return {
      reply:
        "Manejamos horarios flexibles e híbridos (en varios programas no requieres horario semanal fijo). Puedes estudiar Presencial en Chapinero, Online en vivo, Híbrido, Personalizado 1 a 1 o en programas para Empresas. ¿Cuál de estas modalidades se ajusta mejor a tu rutina?",
    };
  }

  // 7. Idiomas, Becas, Empresas, TOEIC / TOEFL
  if (
    lower.includes("ingles") ||
    lower.includes("inglés") ||
    lower.includes("portugues") ||
    lower.includes("portugués") ||
    lower.includes("frances") ||
    lower.includes("francés") ||
    lower.includes("idioma") ||
    lower.includes("beca") ||
    lower.includes("toefl") ||
    lower.includes("toeic") ||
    lower.includes("empresa")
  ) {
    return {
      reply:
        "Ofrecemos Inglés, Portugués y Francés (además de Italiano, Alemán y Ruso) desde A1 hasta C1, con preparación para TOEIC, TOEFL y becas como Fulbright, Chevening o DAAD, además de programas B2B para compañías. ¿Qué idioma te interesa y cuál es tu objetivo principal?",
    };
  }

  // 8. Ubicación / Sede / Contacto
  if (
    lower.includes("donde") ||
    lower.includes("dónde") ||
    lower.includes("ubicac") ||
    lower.includes("direcc") ||
    lower.includes("chapinero") ||
    lower.includes("sede") ||
    lower.includes("parqueadero") ||
    lower.includes("telefono") ||
    lower.includes("teléfono")
  ) {
    return {
      reply:
        "Nuestra sede física está en Chapinero, Bogotá: Carrera 13 # 58-44 (contamos con parqueadero para motos). También puedes llamarnos al PBX +57 601 538 0671 o conversar directo por WhatsApp. ¿Te gustaría agendar una orientación o hacer el Test de Nivel gratis?",
      action: {
        type: "whatsapp",
        label: "Escribir al WhatsApp oficial",
        url: `${waBase}${encodeURIComponent("Hola Experience Prime, quisiera más información sobre los programas y sede en Chapinero.")}`,
      },
    };
  }

  // Fallback orientado a conversión Experience Prime
  return {
    reply:
      "En Experience Prime llevamos más de 10 años formando a más de 20.000 estudiantes con nuestra Metodología CPE e ISO 9001:2015. Para orientarte mejor, cuéntame qué idioma te interesa (Inglés, Portugués o Francés) y si prefieres modalidad presencial, online o híbrida.",
  };
}

export default function ExperiencePrimeDemoPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null);

  // Lead magnet form state
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadLanguage, setLeadLanguage] = useState("Inglés");
  const [leadModality, setLeadModality] = useState("Híbrido y flexible");
  const [leadLevel, setLeadLevel] = useState("No sé mi nivel");

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const offset = 90;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
    setIsMenuOpen(false);
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = leadName.trim() || "Interesado";
    const cleanTel = leadPhone.trim() || "por confirmar";
    const msg = `Hola, mi nombre es ${cleanName} (${cleanTel}). Me interesa ${leadLanguage} en modalidad ${leadModality}. Mi nivel actual es: ${leadLevel} y quiero hacer el Test de Nivel Gratis.`;
    setQueuedMessage(msg);
    setIsChatOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* Header / Navbar */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 md:px-8">
          <button
            onClick={() => scrollToSection("inicio")}
            className="flex items-center gap-2.5 text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              <GraduationCap className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <span className="block text-base font-bold tracking-tight text-slate-950">
                Experience Prime
              </span>
              <span className="block text-[11px] font-medium text-slate-500">
                Escuela de Idiomas · Bogotá
              </span>
            </div>
          </button>

          <nav className="hidden items-center gap-6 lg:flex">
            {NAV_LINKS.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="text-sm font-medium text-slate-600 transition hover:text-blue-600"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsChatOpen(true)}
              className="hidden items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 sm:inline-flex"
            >
              <MessageCircle className="h-4 w-4" />
              Probar Asistente 24/7
            </button>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
              aria-label="Abrir menú"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
            <div className="flex flex-col gap-3">
              {NAV_LINKS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="py-1.5 text-left text-sm font-medium text-slate-700 hover:text-blue-600"
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsChatOpen(true);
                }}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
              >
                <MessageCircle className="h-4 w-4" />
                Probar Asistente WhatsApp
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section
        id="inicio"
        className="relative overflow-hidden bg-slate-950 pb-20 pt-28 text-white md:pb-28 md:pt-36"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.22),transparent_48%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.14),transparent_45%)]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 md:px-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              ETDH Autorizada Secretaría de Educación · ISO 9001:2015
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-400">
              Más de 10 años de trayectoria · +20.000 estudiantes formados
            </p>

            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl lg:text-[52px]">
              Más que clases, experiencias reales
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg">
              El idioma que necesitas para la vida que quieres. Domina Inglés,
              Portugués o Francés con nuestra <strong className="text-white">Metodología CPE</strong>,
              salas temáticas, Speak Easy Club y horarios flexibles en Chapinero u online en vivo.
            </p>

            <div className="mt-8 flex flex-wrap gap-3.5">
              <button
                onClick={() => setIsChatOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
              >
                <MessageCircle className="h-4 w-4" />
                Probar Bot WhatsApp 24/7
              </button>
              <button
                onClick={() => scrollToSection("test-nivel")}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-6 py-3.5 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-800"
              >
                Hacer Test de Nivel Gratis
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Interactive Demo Banner */}
            <div
              onClick={() => setIsChatOpen(true)}
              className="mt-8 inline-flex cursor-pointer items-center gap-3.5 rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-3 transition hover:border-emerald-500/50 hover:bg-slate-900"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">
                  Demo interactiva impulsada por NuncaCierro
                </p>
                <p className="text-xs text-slate-400">
                  Haz clic aquí para probar cómo el asistente califica leads y responde objeciones 24/7
                </p>
              </div>
            </div>
          </div>

          {/* Right showcase card */}
          <div className="lg:col-span-5">
            <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80"
                  alt="Estudiantes en conversación práctica Experience Prime"
                  fill
                  loader={imageLoader}
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
              </div>

              <div className="space-y-4 p-6">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                    <p className="text-lg font-bold text-white">+20.000</p>
                    <p className="text-[11px] text-slate-400">Estudiantes</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                    <p className="text-lg font-bold text-emerald-400">A1 - C1</p>
                    <p className="text-[11px] text-slate-400">Marco Común</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                    <p className="text-lg font-bold text-blue-400">Desde 2014</p>
                    <p className="text-[11px] text-slate-400">Experiencia</p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-300">
                  <span className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-400" />
                    TOEIC / TOEFL (ETS) & Oxford Press
                  </span>
                  <span className="font-semibold text-emerald-400">NTC 5580 / 5555</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Certifications & Authority Bar */}
      <section className="border-b border-slate-200 bg-white py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 md:justify-between md:px-8">
          <span className="flex items-center gap-2 text-slate-700">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            Secretaría de Educación (ETDH)
          </span>
          <span className="flex items-center gap-2 text-slate-700">
            <Award className="h-4 w-4 text-blue-600" />
            ISO 9001:2015 · NTC 5580 · NTC 5555
          </span>
          <span className="flex items-center gap-2 text-slate-700">
            <BookOpen className="h-4 w-4 text-blue-600" />
            TOEIC® & TOEFL® (ETS / Certilingua)
          </span>
          <span className="flex items-center gap-2 text-slate-700">
            <Globe className="h-4 w-4 text-blue-600" />
            Oxford University Press
          </span>
        </div>
      </section>

      {/* Metodología CPE */}
      <section id="metodologia" className="mx-auto max-w-6xl px-4 py-20 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
            Metodología Propia
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
            Metodología CPE: habla desde el día 1 sin memorización
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Diseñada para resultados reales en empleo internacional, becas
            (Fulbright, Chevening, DAAD), negocios y viajes.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xs transition hover:border-blue-200 hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-lg font-bold text-blue-700">
              C
            </div>
            <h3 className="mt-5 text-xl font-bold text-slate-950">Comprensión</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Entiendes la estructura y lógica natural del idioma desde el primer
              día, incluso si inicias completamente desde cero.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xs transition hover:border-blue-200 hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-lg font-bold text-emerald-700">
              P
            </div>
            <h3 className="mt-5 text-xl font-bold text-slate-950">Producción</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Hablas y aplicas lo aprendido en entornos guiados de práctica activa,
              dejando atrás la memorización mecánica de reglas.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xs transition hover:border-blue-200 hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-lg font-bold text-amber-700">
              E
            </div>
            <h3 className="mt-5 text-xl font-bold text-slate-950">Experiencia</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Inmersión real en situaciones prácticas a través de nuestras salas
              temáticas y el club de conversación <strong className="text-slate-900">Speak Easy Club</strong>.
            </p>
          </div>
        </div>

        {/* Diferenciales clave */}
        <div className="mt-8 grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 md:grid-cols-4">
          <div className="flex items-start gap-3">
            <Mic className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Speak Easy Club</p>
              <p className="text-xs text-slate-600">Salas temáticas y conversación en vivo.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Refuerzos ilimitados</p>
              <p className="text-xs text-slate-600">Acompañamiento constante en tu avance.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Horarios flexibles</p>
              <p className="text-xs text-slate-600">Sin horario semanal rígido en varios programas.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Briefcase className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Resultados reales</p>
              <p className="text-xs text-slate-600">Empleo global, becas, negocios y viajes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Idiomas, Niveles y Programas */}
      <section id="programas" className="border-y border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
              Oferta Académica y Corporativa
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              Idiomas, niveles y programas a tu medida
            </h2>
          </div>

          {/* Idiomas */}
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LANGUAGES.map((lang) => (
              <div
                key={lang.name}
                className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5"
              >
                <span className="inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800">
                  {lang.tag}
                </span>
                <h3 className="mt-3 text-lg font-bold text-slate-950">{lang.name}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{lang.desc}</p>
              </div>
            ))}
          </div>

          {/* Niveles A1-C1 */}
          <div className="mt-10 rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white md:p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
                  Marco Común Europeo
                </p>
                <h3 className="mt-1 text-xl font-bold">Niveles disponibles desde A1 hasta C1</h3>
              </div>
              <button
                onClick={() => setIsChatOpen(true)}
                className="inline-flex items-center gap-2 self-start rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Consultar mi nivel en WhatsApp
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-5">
              {LEVELS.map((lvl) => (
                <div
                  key={lvl.code}
                  className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4"
                >
                  <span className="text-lg font-bold text-emerald-400">{lvl.code}</span>
                  <p className="mt-1 text-sm font-semibold text-white">{lvl.name}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{lvl.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 6 Líneas de programas */}
          <div className="mt-12">
            <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-slate-950">
              <Layers className="h-5 w-5 text-blue-600" />
              Líneas de Programas
            </h3>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {PROGRAMS.map((prog) => (
                <div
                  key={prog.title}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs transition hover:border-blue-300 hover:shadow-sm"
                >
                  <div>
                    <h4 className="text-base font-bold text-slate-950">{prog.title}</h4>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                      {prog.description}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setQueuedMessage(`Hola, quiero información sobre ${prog.title}`);
                      setIsChatOpen(true);
                    }}
                    className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Orientarme por WhatsApp
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Modalidades */}
          <div className="mt-12">
            <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-slate-950">
              <Building2 className="h-5 w-5 text-emerald-600" />
              Modalidades de Estudio
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {MODALITIES.map((mod) => (
                <div
                  key={mod.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <p className="text-sm font-bold text-slate-950">{mod.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{mod.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Lead Magnet: Test de Nivel Gratis + Formulario conectado al Bot */}
      <section id="test-nivel" className="mx-auto max-w-6xl px-4 py-20 md:px-8">
        <div className="grid items-center gap-10 rounded-3xl border border-blue-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-8 text-white shadow-xl md:p-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              Lead Magnet Principal · 100% Sin Costo
            </span>
            <h2 className="mt-4 text-3xl font-bold leading-tight md:text-4xl">
              Test de Nivel Gratis Online en 5 a 7 minutos
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Evalúa tu dominio actual con 20 preguntas prácticas de{" "}
              <strong className="text-white">Grammar, Vocabulary, Reading y Listening</strong>.
              Posteriormente, una persona de nuestro equipo académico revisará tu{" "}
              <strong className="text-white">Speaking</strong> para darte un plan exacto.
            </p>

            <ul className="mt-6 space-y-2.5 text-xs text-slate-200">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                20 preguntas dinámicas (5 a 7 minutos)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Revisión personalizada de Speaking por el equipo
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Orientación inmediata según tu objetivo y presupuesto
              </li>
            </ul>
          </div>

          <form
            onSubmit={handleLeadSubmit}
            className="space-y-4 rounded-2xl border border-white/10 bg-white p-6 text-slate-900 shadow-lg lg:col-span-6"
          >
            <div>
              <h3 className="text-lg font-bold text-slate-950">
                Solicitar Test de Nivel y Orientación
              </h3>
              <p className="text-xs text-slate-500">
                Al enviar, el asistente de WhatsApp te responderá de inmediato con tus datos.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Nombre completo
                </label>
                <input
                  type="text"
                  required
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="Ej. Camilo Torres"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Teléfono (+57)
                </label>
                <input
                  type="tel"
                  required
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  placeholder="Ej. 311 550 0000"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Idioma de interés
                </label>
                <select
                  value={leadLanguage}
                  onChange={(e) => setLeadLanguage(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs outline-none focus:border-blue-600"
                >
                  <option value="Inglés">Inglés</option>
                  <option value="Portugués">Portugués</option>
                  <option value="Francés">Francés</option>
                  <option value="Otro (Italiano / Alemán / Ruso)">Otro</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Nivel actual
                </label>
                <select
                  value={leadLevel}
                  onChange={(e) => setLeadLevel(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs outline-none focus:border-blue-600"
                >
                  <option value="No sé mi nivel">No sé mi nivel</option>
                  <option value="A1 (Principiante)">A1 (Principiante)</option>
                  <option value="A2 (Básico)">A2 (Básico)</option>
                  <option value="B1 (Intermedio)">B1 (Intermedio)</option>
                  <option value="B2 (Intermedio Alto)">B2 (Intermedio Alto)</option>
                  <option value="C1 (Avanzado)">C1 (Avanzado)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Modalidad de interés
              </label>
              <select
                value={leadModality}
                onChange={(e) => setLeadModality(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs outline-none focus:border-blue-600"
              >
                <option value="Híbrido y flexible">Híbrido</option>
                <option value="Online en vivo">Online en vivo</option>
                <option value="Presencial (Chapinero)">Presencial (Chapinero)</option>
                <option value="Personalizado 1 a 1">1 a 1</option>
                <option value="Empresas">Empresas</option>
                <option value="Solicitudes internacionales">Solicitudes internacionales</option>
              </select>
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700"
            >
              <MessageCircle className="h-4 w-4" />
              Iniciar Test y Asesoría en Bot WhatsApp
            </button>
          </form>
        </div>
      </section>

      {/* Objeciones Frecuentes / FAQ */}
      <section id="objeciones" className="border-t border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
              Resolvemos tus dudas
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              Preguntas y objeciones frecuentes
            </h2>
          </div>

          <div className="mt-10 space-y-3">
            {OBJECTIONS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 transition"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between px-6 py-4 text-left"
                  >
                    <span className="text-sm font-bold text-slate-900">{faq.question}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-200/70 bg-white px-6 py-4 text-xs leading-relaxed text-slate-600">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contacto y Sede Chapinero */}
      <footer id="contacto" className="bg-slate-950 py-16 text-slate-300">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-3 md:px-8">
          <div>
            <div className="flex items-center gap-2.5 text-white">
              <GraduationCap className="h-6 w-6 text-emerald-400" />
              <span className="text-lg font-bold">Experience Prime</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              Institución de Educación para el Trabajo y el Desarrollo Humano
              (ETDH) autorizada por la Secretaría de Educación de Bogotá.
              Certificación ISO 9001:2015, NTC 5580:2011 y NTC 5555:2011.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <h4 className="text-sm font-bold text-white">Sede Principal Chapinero</h4>
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <span>Carrera 13 # 58-44, Chapinero, Bogotá, Colombia (Parqueadero para motos)</span>
            </p>
            <p className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>+20.000 estudiantes formados desde 2014</span>
            </p>
          </div>

          <div className="space-y-2.5 text-xs">
            <h4 className="text-sm font-bold text-white">Canales de Contacto</h4>
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>PBX: +57 601 538 0671</span>
            </p>
            <p className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>+57 311 550 3372 / +57 310 883 9992 / +57 304 299 9979</span>
            </p>
            <button
              onClick={() => setIsChatOpen(true)}
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Abrir Simulador WhatsApp
            </button>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-6xl border-t border-slate-800 px-4 pt-6 text-center text-[11px] text-slate-500 md:px-8">
          Demostración interactiva de atención comercial 24/7 impulsada por NuncaCierro.
        </div>
      </footer>

      {/* Simulador de Bot WhatsApp */}
      <DemoChatWidget
        businessName="Experience Prime"
        categoryName="Escuela de Idiomas (Metodología CPE)"
        services={PROGRAMS}
        faqs={OBJECTIONS}
        whatsappNumber={WHATSAPP_NUMBER}
        schedule={SCHEDULE}
        address={ADDRESS}
        isOpenControlled={isChatOpen}
        onOpenChange={setIsChatOpen}
        welcomeMessageText="Hola, bienvenido a Experience Prime. Soy tu asistente virtual 24/7. Puedo orientarte sobre nuestros programas de Inglés, Portugués o Francés, la Metodología CPE, modalidades flexibles o enviarte el Test de Nivel Gratis. ¿Qué idioma te interesa?"
        quickQuestionsList={QUICK_QUESTIONS}
        customReplyFn={experiencePrimeBotReply}
        queuedUserMessage={queuedMessage}
        onQueuedMessageConsumed={() => setQueuedMessage(null)}
      />
    </div>
  );
}
