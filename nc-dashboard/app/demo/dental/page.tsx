"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  Menu,
  X,
  ShieldCheck,
  Star,
  MapPin,
  Phone,
  CalendarDays,
  HeartPulse,
  BadgeCheck,
  Smile,
} from "lucide-react";

const imageLoader = ({ src }: { src: string }) => src;

const NAV_LINKS = [
  { label: "Inicio", id: "home" },
  { label: "Tratamientos", id: "tratamientos" },
  { label: "Doctores", id: "doctores" },
  { label: "Casos Reales", id: "casos" },
  { label: "Opiniones", id: "opiniones" },
  { label: "FAQ", id: "faq" },
  { label: "Contacto", id: "contacto" },
];

const WHATSAPP_MESSAGE =
  "Hola, vi la demo de Sonrisa Premium y quiero agendar una valoración.";

type Treatment = {
  title: string;
  description: string;
};

const TREATMENTS: Treatment[] = [
  {
    title: "Limpieza dental",
    description:
      "Eliminamos placa y sarro con técnicas preventivas para mejorar salud oral, encías y aliento desde la primera sesión.",
  },
  {
    title: "Blanqueamiento profesional",
    description:
      "Aclaramos el tono dental con protocolos clínicos seguros para lograr una sonrisa natural, uniforme y de larga duración.",
  },
  {
    title: "Ortodoncia invisible",
    description:
      "Alineadores transparentes personalizados que corrigen la mordida de forma cómoda, estética y con seguimiento digital.",
  },
  {
    title: "Diseño de sonrisa",
    description:
      "Planificamos proporción, forma y color para armonizar tus dientes con tu rostro y mejorar tu confianza al sonreír.",
  },
  {
    title: "Implantes dentales",
    description:
      "Reemplazamos piezas ausentes con implantes de titanio y coronas funcionales que recuperan estabilidad y estética.",
  },
  {
    title: "Urgencias odontológicas",
    description:
      "Atendemos dolor agudo, fracturas y traumatismos con diagnóstico inmediato para aliviar síntomas y evitar complicaciones.",
  },
  {
    title: "Endodoncia",
    description:
      "Tratamos infecciones pulpares conservando la pieza dental mediante instrumentación avanzada y sellado de alta precisión.",
  },
  {
    title: "Odontopediatría",
    description:
      "Cuidado dental infantil con enfoque preventivo, control de crecimiento y atención amable para generar hábitos saludables.",
  },
];

const DOCTORS = [
  {
    name: "Dra. Valeria Cárdenas",
    role: "Especialista en Estética Dental",
    experience: "12 años de experiencia clínica",
    certification: "Certificada en Diseño Digital de Sonrisa",
    image:
      "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Dr. Tomás Paredes",
    role: "Implantólogo Oral",
    experience: "15 años en rehabilitación oral",
    certification: "Miembro de la Sociedad Latinoamericana de Implantes",
    image:
      "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Dra. Martina López",
    role: "Ortodoncista",
    experience: "10 años en ortodoncia invisible",
    certification: "Certificada en ortodoncia digital avanzada",
    image:
      "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=900&q=80",
  },
];

const CASES = [
  {
    title: "Diseño de sonrisa en 6 semanas",
    procedure:
      "Combinamos blanqueamiento y carillas de alta estética para corregir coloración severa y bordes desgastados.",
    before:
      "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=900&q=80",
    after:
      "https://images.unsplash.com/photo-1588776814546-daab30f310ce?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Rehabilitación con implante unitario",
    procedure:
      "Restauramos una pieza ausente con implante de titanio y corona cerámica para recuperar función masticatoria.",
    before:
      "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=900&q=80",
    after:
      "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Alineación con ortodoncia invisible",
    procedure:
      "Plan de alineadores transparentes para corregir apiñamiento leve y mejorar la mordida de forma discreta.",
    before:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80",
    after:
      "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=900&q=80",
  },
];

const REVIEWS = [
  {
    name: "Camila R.",
    treatment: "Blanqueamiento profesional",
    comment:
      "Me explicaron cada etapa y el resultado fue súper natural. La clínica transmite confianza desde que llegas.",
  },
  {
    name: "Jorge M.",
    treatment: "Implante dental",
    comment:
      "Pensé que sería doloroso, pero el proceso fue muy cuidadoso. Recuperé mi sonrisa y puedo comer sin molestias.",
  },
  {
    name: "Paula S.",
    treatment: "Ortodoncia invisible",
    comment:
      "El seguimiento digital me encantó. Todo el tratamiento estuvo muy bien planificado y siempre respondieron mis dudas.",
  },
  {
    name: "Ricardo T.",
    treatment: "Urgencia odontológica",
    comment:
      "Me atendieron el mismo día con dolor intenso. Diagnóstico rápido, trato humano y alivio inmediato.",
  },
];

const FAQS = [
  {
    question: "¿Cuánto dura un blanqueamiento dental?",
    answer:
      "La sesión clínica suele durar entre 60 y 90 minutos, dependiendo del tono inicial y del objetivo estético. Los resultados pueden mantenerse de 8 a 18 meses con buena higiene, controles periódicos y evitando el consumo frecuente de café, vino tinto y tabaco durante las primeras semanas.",
  },
  {
    question: "¿Duele un implante dental?",
    answer:
      "El procedimiento se realiza con anestesia local y protocolos de mínima invasión, por lo que durante la cirugía no deberías sentir dolor. Después puede haber molestia controlable por 24 a 72 horas, similar a una extracción simple. Entregamos medicación y seguimiento para una recuperación segura.",
  },
  {
    question: "¿Atienden urgencias?",
    answer:
      "Sí. Contamos con atención de urgencias odontológicas para dolor intenso, infecciones, fracturas dentales, traumatismos y restauraciones desprendidas. Evaluamos de inmediato con radiografía digital cuando es necesario y priorizamos el alivio del dolor antes del tratamiento definitivo.",
  },
  {
    question: "¿Cuánto cuesta una valoración?",
    answer:
      "La valoración inicial tiene un costo preferencial y en campañas especiales puede ser gratuita. Incluye entrevista clínica, revisión intraoral, plan de tratamiento y estimación de tiempos. Si requieres estudios complementarios, se te informa de forma transparente antes de realizarlos.",
  },
  {
    question: "¿Aceptan seguros o pagos por cuotas?",
    answer:
      "Trabajamos con seguros odontológicos seleccionados y también ofrecemos facilidades de pago por cuotas para tratamientos integrales. El equipo administrativo revisa tu cobertura, explica copagos y arma un plan financiero claro para que puedas avanzar sin sorpresas.",
  },
];

const TECHNOLOGY = [
  "Scanner 3D",
  "Radiografía digital",
  "Ortodoncia invisible",
  "Láser dental",
];

function WaveDivider() {
  return (
    <div className="wave-divider" aria-hidden="true">
      <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
        <path d="M0,64 C240,120 420,0 720,42 C1020,84 1190,10 1440,54 L1440,120 L0,120 Z" />
      </svg>
    </div>
  );
}

export default function DentalDemoPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const whatsappHref = useMemo(
    () =>
      `https://wa.me/573000000000?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`,
    [],
  );

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    const headerOffset = 96;
    const elementPosition =
      element.getBoundingClientRect().top + window.scrollY;
    const offsetPosition = elementPosition - headerOffset;

    window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    setMobileOpen(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => scrollToSection("home")}
            className="text-left text-sm font-semibold leading-tight text-blue-900 sm:text-base"
          >
            Sonrisa Premium
            <span className="block text-xs font-medium text-slate-500 sm:text-sm">
              Clínica Dental
            </span>
          </button>

          <nav className="hidden items-center gap-5 lg:flex">
            {NAV_LINKS.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="text-sm text-slate-600 transition hover:text-blue-700"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <button
              onClick={() => scrollToSection("contacto")}
              className="rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Agendar Cita
            </button>
          </div>

          <button
            className="rounded-xl border border-slate-300 p-2 text-slate-700 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-[60] bg-slate-900/30 transition ${
          mobileOpen ? "visible opacity-100" : "invisible opacity-0"
        }`}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={`fixed right-0 top-0 z-[70] h-full w-[86%] max-w-sm border-l border-slate-200 bg-white p-6 shadow-2xl transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-center justify-between">
          <p className="font-semibold text-blue-900">Sonrisa Premium</p>
          <button
            className="rounded-lg border border-slate-200 p-2"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col gap-1">
          {NAV_LINKS.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className="rounded-xl px-4 py-3 text-left text-slate-700 transition hover:bg-slate-100"
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => scrollToSection("contacto")}
          className="mt-6 w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white"
        >
          Agendar Cita
        </button>
      </aside>

      <section
        id="home"
        className="relative overflow-hidden px-4 pb-24 pt-36 sm:px-6 lg:px-8"
      >
        <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
          <div className="fade-in-up space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              Atención odontológica premium
            </span>
            <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
              Tu sonrisa merece atención premium
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-slate-600">
              Combina confianza, profesionalismo y tecnología avanzada en una
              clínica diseñada para ofrecer diagnósticos precisos, tratamientos
              seguros y resultados naturales.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => scrollToSection("tratamientos")}
                className="rounded-full bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800"
              >
                Ver Tratamientos
              </button>
              <button
                onClick={() => scrollToSection("contacto")}
                className="rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
              >
                Agendar Cita
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="soft-hover rounded-2xl border border-slate-200 bg-white p-4">
                <Phone className="mb-2 h-4 w-4 text-blue-700" />
                <p className="text-sm font-medium text-slate-700">
                  Atención inmediata
                </p>
              </div>
              <div className="soft-hover rounded-2xl border border-slate-200 bg-white p-4">
                <BadgeCheck className="mb-2 h-4 w-4 text-blue-700" />
                <p className="text-sm font-medium text-slate-700">
                  Tecnología avanzada
                </p>
              </div>
              <div className="soft-hover rounded-2xl border border-slate-200 bg-white p-4">
                <ShieldCheck className="mb-2 h-4 w-4 text-blue-700" />
                <p className="text-sm font-medium text-slate-700">
                  Especialistas certificados
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <p className="text-sm text-slate-700">
                ⭐ 4.9/5 basado en 1.200 pacientes
              </p>
            </div>
          </div>

          <div className="fade-in-up relative">
            <Image
              loader={imageLoader}
              unoptimized
              src="https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=1400&q=80"
              alt="Clínica dental moderna"
              width={1400}
              height={1000}
              className="h-[520px] w-full rounded-3xl object-cover shadow-xl"
            />
            <div className="absolute -bottom-6 -left-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Tiempo promedio de espera
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                &lt; 10 min
              </p>
            </div>
          </div>
        </div>
      </section>

      <WaveDivider />

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-3xl border border-emerald-200 bg-emerald-50 p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <HeartPulse className="mt-1 h-6 w-6 text-emerald-700" />
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Emergencias 24/7
                </h2>
                <p className="mt-1 max-w-2xl text-slate-600">
                  Si tienes dolor intenso, inflamación o trauma dental, nuestro
                  equipo está listo para atenderte de forma inmediata.
                </p>
              </div>
            </div>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="button-glow inline-flex items-center justify-center rounded-full bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700"
            >
              Contactar por WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section id="tratamientos" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-12 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              Tratamientos
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
              Soluciones odontológicas para cada necesidad
            </h2>
            <p className="mt-4 text-slate-600">
              Diseñamos planes de tratamiento personalizados con diagnóstico
              digital y seguimiento clínico continuo.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TREATMENTS.map((item) => (
              <article
                key={item.title}
                className="fade-in-up soft-hover rounded-2xl border border-slate-200 bg-white p-5"
              >
                <Smile className="mb-4 h-5 w-5 text-blue-700" />
                <h3 className="text-lg font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <WaveDivider />

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              Tecnología
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              Precisión clínica con tecnología de última generación
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {TECHNOLOGY.map((item) => (
              <div
                key={item}
                className="soft-hover rounded-2xl border border-slate-200 bg-white p-6"
              >
                <BadgeCheck className="h-5 w-5 text-emerald-600" />
                <h3 className="mt-4 font-semibold text-slate-900">{item}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Equipo avanzado para diagnósticos más rápidos, tratamientos
                  más cómodos y resultados altamente predecibles.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="doctores" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-12 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              Doctores
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              Equipo médico especializado y humano
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {DOCTORS.map((doctor) => (
              <article
                key={doctor.name}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <Image
                  loader={imageLoader}
                  unoptimized
                  src={doctor.image}
                  alt={doctor.name}
                  width={900}
                  height={1100}
                  className="h-64 w-full rounded-2xl object-cover"
                />
                <h3 className="mt-4 text-xl font-semibold text-slate-900">
                  {doctor.name}
                </h3>
                <p className="mt-1 font-medium text-blue-700">{doctor.role}</p>
                <p className="mt-3 text-sm text-slate-600">
                  {doctor.experience}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {doctor.certification}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <WaveDivider />

      <section id="casos" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-12 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              Casos Reales
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              Antes y Después
            </h2>
          </div>

          <div className="space-y-8">
            {CASES.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-slate-200 bg-white p-6"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Image
                    loader={imageLoader}
                    unoptimized
                    src={item.before}
                    alt={`Antes - ${item.title}`}
                    width={900}
                    height={900}
                    className="h-60 w-full rounded-2xl object-cover"
                  />
                  <Image
                    loader={imageLoader}
                    unoptimized
                    src={item.after}
                    alt={`Después - ${item.title}`}
                    width={900}
                    height={900}
                    className="h-60 w-full rounded-2xl object-cover"
                  />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-slate-600">{item.procedure}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="opiniones" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              Opiniones
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              Pacientes satisfechos con resultados reales
            </h2>
          </div>

          <div className="hide-scrollbar flex gap-5 overflow-x-auto pb-2">
            {REVIEWS.map((review) => (
              <article
                key={review.name}
                className="min-w-[290px] max-w-[340px] rounded-2xl border border-slate-200 bg-white p-5 md:min-w-[350px]"
              >
                <div className="mb-3 flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-slate-600">
                  &ldquo;{review.comment}&rdquo;
                </p>
                <p className="mt-4 font-semibold text-slate-900">
                  {review.name}
                </p>
                <p className="text-sm text-blue-700">{review.treatment}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
            <p className="font-semibold text-slate-900">Garantía y confianza</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1">
              Bioseguridad certificada
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1">
              Materiales aprobados
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1">
              Protocolos internacionales
            </span>
          </div>
        </div>
      </section>

      <section id="faq" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              FAQ
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              Preguntas frecuentes
            </h2>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <article
                  key={faq.question}
                  className="rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-4 text-left"
                  >
                    <span className="font-semibold text-slate-900">
                      {faq.question}
                    </span>
                    <span className="text-2xl leading-none text-blue-700">
                      {isOpen ? "\u2212" : "+"}
                    </span>
                  </button>
                  <div
                    className={`grid transition-all duration-300 ${
                      isOpen ? "mt-4 grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <p className="overflow-hidden text-sm leading-relaxed text-slate-600">
                      {faq.answer}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="contacto" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
            <h2 className="text-3xl font-bold text-slate-900">
              Agenda tu cita
            </h2>
            <p className="mt-2 text-slate-600">
              Completa el formulario y nuestro equipo te contactará para
              confirmar fecha, evaluación y plan de tratamiento.
            </p>

            <form className="mt-6 grid gap-4">
              <input className="field" placeholder="Nombre completo" />
              <input className="field" placeholder="Teléfono" />
              <input
                className="field"
                placeholder="Correo electrónico"
                type="email"
              />
              <select className="field" defaultValue="">
                <option value="" disabled>
                  Selecciona tratamiento
                </option>
                {TREATMENTS.map((item) => (
                  <option key={item.title} value={item.title}>
                    {item.title}
                  </option>
                ))}
              </select>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute right-4 top-3.5 h-4 w-4 text-slate-400" />
                <input className="field" type="date" />
              </div>
              <textarea
                className="field min-h-28"
                placeholder="Cuéntanos brevemente tu caso"
              />
              <button
                type="button"
                className="button-glow rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800"
              >
                Solicitar Cita
              </button>
            </form>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
            <h3 className="text-2xl font-bold text-slate-900">
              Información de contacto
            </h3>
            <div className="mt-6 space-y-4 text-slate-600">
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-700" />
                Av. Salud 245, Torre Médica, Consultorio 802
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-blue-700" />
                +57 300 000 0000
              </p>
              <p className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-blue-700" />
                Lunes a Sábado · 7:00 a.m. &ndash; 8:00 p.m.
              </p>
              <p>contacto@sonrisapremium.com</p>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-100 p-4">
              <p className="text-sm font-semibold text-slate-700">
                Mapa referencial
              </p>
              <div className="mt-3 h-44 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300" />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="button-glow rounded-xl bg-emerald-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-emerald-700"
              >
                WhatsApp
              </a>
              <a
                href="https://maps.google.com/?q=Cl%C3%ADnica%20Dental"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-300 px-4 py-3 text-center font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
              >
                Google Maps
              </a>
            </div>
          </article>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-3xl bg-blue-800 p-8 text-white md:p-12">
          <h2 className="text-3xl font-bold">
            Agenda hoy y recibe valoración gratuita
          </h2>
          <p className="mt-3 max-w-2xl text-blue-100">
            Cupos limitados para nuevos pacientes. Reserva tu cita y recibe un
            plan diagnóstico personalizado con acompañamiento profesional.
          </p>
          <button
            onClick={() => scrollToSection("contacto")}
            className="mt-6 rounded-full bg-white px-6 py-3 font-semibold text-blue-800 transition hover:bg-slate-100"
          >
            Agendar Cita
          </button>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-4 text-sm text-slate-600 md:flex-row md:items-center">
          <p>&copy; {new Date().getFullYear()} Sonrisa Premium Clínica Dental</p>
          <div className="flex flex-wrap items-center gap-4">
            <a href="#">Privacidad</a>
            <a href="#">Términos</a>
            <a href="#">Instagram</a>
            <a href={whatsappHref} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </div>
        </div>
      </footer>

      <a
        href={whatsappHref}
        target="_blank"
        rel="noreferrer"
        className="button-glow fixed bottom-6 right-6 z-40 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-700"
      >
        WhatsApp
      </a>

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        .field {
          width: 100%;
          border-radius: 0.9rem;
          border: 1px solid rgb(226 232 240);
          background: white;
          padding: 0.8rem 1rem;
          color: rgb(30 41 59);
          outline: none;
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .field:focus {
          border-color: rgb(59 130 246);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
        }

        .wave-divider {
          line-height: 0;
        }

        .wave-divider svg {
          width: 100%;
          height: 80px;
          display: block;
        }

        .wave-divider path {
          fill: #ffffff;
        }

        .fade-in-up {
          animation: fadeUp 0.8s ease both;
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .soft-hover {
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .soft-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
        }

        .button-glow {
          box-shadow: 0 0 0 rgba(16, 185, 129, 0);
          transition: box-shadow 0.25s ease;
        }

        .button-glow:hover {
          box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.14);
        }

        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </main>
  );
}
