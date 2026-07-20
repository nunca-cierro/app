"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Menu,
  X,
  Dumbbell,
  Flame,
  Zap,
  Trophy,
  Calendar,
  CheckCircle2,
} from "lucide-react";

const imageLoader = ({ src }: { src: string }) => src;

const HEADER_OFFSET = 88;

const navLinks = [
  { label: "Inicio", id: "home" },
  { label: "Programas", id: "programas" },
  { label: "Horarios", id: "horarios" },
  { label: "Transformaciones", id: "transformaciones" },
  { label: "Planes", id: "planes" },
  { label: "Entrenadores", id: "trainers" },
  { label: "FAQ", id: "faq" },
  { label: "Contacto", id: "contact" },
];

const programas = [
  {
    nombre: "Crossfit",
    descripcion: "WODs intensos para potencia, agilidad y resistencia.",
  },
  {
    nombre: "Funcional",
    descripcion: "Movimientos reales para un cuerpo fuerte y eficiente.",
  },
  {
    nombre: "Boxeo Fitness",
    descripcion: "Cardio explosivo, técnica y descarga total de estrés.",
  },
  {
    nombre: "Hipertrofia",
    descripcion: "Plan de fuerza y volumen con seguimiento semanal.",
  },
  {
    nombre: "Spinning",
    descripcion: "Sesiones de alto ritmo para quemar calorías al máximo.",
  },
  {
    nombre: "Yoga Recovery",
    descripcion: "Movilidad, respiración y recuperación activa guiada.",
  },
];

const faqItems = [
  {
    pregunta: "¿Ofrecen entrenamiento personalizado?",
    respuesta:
      "Sí. En IRONCORE GYM contamos con entrenadores certificados que diseñan planes de entrenamiento personalizados según tu nivel, historial físico y objetivos, para que avances de forma segura y con resultados medibles desde las primeras semanas.",
  },
  {
    pregunta: "¿Puedo entrenar si soy principiante?",
    respuesta:
      "Totalmente. Nuestro equipo adapta cada rutina para principiantes, enseñando técnica correcta, progresiones y control de carga. La idea es que ganes confianza y hábitos sostenibles sin sentirte fuera de lugar en ningún momento.",
  },
  {
    pregunta: "¿Qué incluye la membresía Elite?",
    respuesta:
      "La membresía Elite incluye acceso 24/7, clases premium ilimitadas, evaluación corporal mensual, asesoría nutricional base, seguimiento de progreso y prioridad en reservas de horarios de alta demanda.",
  },
  {
    pregunta: "¿Tienen duchas y lockers?",
    respuesta:
      "Sí, disponemos de vestidores con duchas, lockers de uso diario y zonas de higiene equipadas para que puedas entrenar antes o después del trabajo con total comodidad y fluidez en tu rutina.",
  },
  {
    pregunta: "¿Se puede pagar mensual?",
    respuesta:
      "Sí, ofrecemos pago mensual y también planes trimestrales o anuales con beneficios adicionales. Puedes elegir la modalidad que mejor se adapte a tu presupuesto y ritmo de entrenamiento, sin trámites complicados.",
  },
];

export default function GymDemoPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const scrollToSection = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;

    const targetPosition =
      target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top: targetPosition, behavior: "smooth" });
    setMenuOpen(false);
  };

  const toggleFaq = (index: number) => {
    setOpenFaq((prev) => (prev === index ? null : index));
  };

  return (
    <main className="cyber-grid min-h-screen overflow-x-hidden bg-black pb-32 text-white md:pb-28">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-60">
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
      </div>

      <header className="fixed left-0 right-0 top-0 z-50 border-b border-cyan-400/40 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto flex h-[88px] min-w-0 max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
          <button
            onClick={() => scrollToSection("home")}
            className="max-w-[calc(100vw-6rem)] min-w-0 truncate text-left text-[11px] font-black tracking-[0.14em] text-cyan-300 transition hover:text-cyan-100 sm:text-sm sm:tracking-[0.2em] md:max-w-none md:text-base md:tracking-[0.35em]"
          >
            IRONCORE GYM
          </button>

          <nav className="hidden items-center gap-6 lg:flex">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="text-sm text-zinc-300 transition hover:text-cyan-300"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="hidden lg:block">
            <button
              onClick={() => scrollToSection("contact")}
              className="neon-btn rounded-full px-5 py-2 text-sm font-semibold"
            >
              Inscribirme
            </button>
          </div>

          <button
            className="rounded-lg border border-cyan-400/40 p-2 text-cyan-300 lg:hidden"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Abrir menú"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-cyan-400/30 bg-black/95 px-4 py-4 lg:hidden">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.id)}
                  className="rounded-lg border border-cyan-500/20 bg-zinc-900/50 px-4 py-3 text-left text-zinc-200 transition hover:border-cyan-400/60 hover:text-cyan-300"
                >
                  {link.label}
                </button>
              ))}
              <button
                onClick={() => scrollToSection("contact")}
                className="neon-btn mt-2 rounded-lg px-4 py-3 text-sm font-semibold"
              >
                Inscribirme
              </button>
            </div>
          </div>
        )}
      </header>

      <section
        id="home"
        className="relative z-10 flex min-h-screen items-center overflow-hidden pt-28 md:pt-32"
      >
        <Image
          loader={imageLoader}
          unoptimized
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=2000&q=80"
          alt="Gimnasio moderno con iluminación intensa"
          width={2000}
          height={1300}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.2),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.15),transparent_40%),radial-gradient(circle_at_center,rgba(168,85,247,0.2),transparent_55%)]" />

        <div className="relative mx-auto w-full max-w-7xl px-4 md:px-8">
          <p className="mb-4 text-xs uppercase tracking-[0.2em] text-cyan-300 sm:text-sm sm:tracking-[0.25em]">
            Rendimiento sin límites
          </p>
          <h1 className="max-w-4xl text-4xl font-black leading-tight sm:text-5xl md:text-7xl">
            Entrena duro.
            <br />
            Vive fuerte.
          </h1>
          <p className="mt-6 max-w-2xl text-sm text-zinc-200 sm:text-base md:text-lg">
            La experiencia fitness más intensa de la ciudad: tecnología,
            entrenamiento de alto nivel y una comunidad que no se detiene.
          </p>

          <div className="mt-8 flex flex-wrap gap-3 sm:gap-4">
            <button
              onClick={() => scrollToSection("planes")}
              className="neon-btn rounded-full px-5 py-3 text-sm font-semibold sm:px-7"
            >
              Ver Planes
            </button>
            <a
              href="https://wa.me/5215512345678?text=Hola%20quiero%20agendar%20mi%20clase%20gratis%20en%20IRONCORE%20GYM"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-fuchsia-400/50 bg-fuchsia-500/10 px-5 py-3 text-sm font-semibold text-fuchsia-200 transition hover:bg-fuchsia-500/20 sm:px-7"
            >
              Clase Gratis
            </a>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icono: Calendar,
                titulo: "24/7",
                texto: "Acceso total todo el año",
              },
              {
                icono: Trophy,
                titulo: "500+ miembros",
                texto: "Comunidad activa",
              },
              {
                icono: CheckCircle2,
                titulo: "Certificados",
                texto: "Entrenadores profesionales",
              },
              {
                icono: Zap,
                titulo: "3 sedes",
                texto: "Ubicaciones estratégicas",
              },
            ].map((stat) => (
              <div
                key={stat.titulo}
                className="neon-card flex items-start gap-3 rounded-2xl bg-black/45 p-4"
              >
                <stat.icono className="mt-0.5 text-cyan-300" size={20} />
                <div>
                  <p className="font-semibold text-cyan-100">{stat.titulo}</p>
                  <p className="text-sm text-zinc-300">{stat.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="programas"
        className="diagonal-section relative z-10 py-16 md:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-10">
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">
              Programas
            </p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl md:text-4xl">
              Entrenamiento diseñado para resultados reales
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {programas.map((item, index) => (
              <article
                key={item.nombre}
                className="neon-card rounded-2xl bg-zinc-950/70 p-6"
              >
                <div className="mb-4 inline-flex rounded-xl border border-cyan-400/40 bg-cyan-400/10 p-3 text-cyan-300">
                  {index % 3 === 0 ? (
                    <Dumbbell />
                  ) : index % 3 === 1 ? (
                    <Flame />
                  ) : (
                    <Zap />
                  )}
                </div>
                <h3 className="text-xl font-semibold text-white">
                  {item.nombre}
                </h3>
                <p className="mt-2 text-zinc-300">{item.descripcion}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="horarios" className="relative z-10 py-16 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 md:grid-cols-[2fr_1fr] md:px-8">
          <div className="neon-card min-w-0 rounded-2xl bg-zinc-950/70 p-6 md:p-8">
            <p className="text-sm uppercase tracking-[0.25em] text-fuchsia-300">
              Horarios
            </p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl md:text-4xl">
              Dashboard semanal de clases
            </h2>
            <div className="mt-6 w-full overflow-x-auto">
              <table className="w-full table-fixed text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-cyan-400/25 text-cyan-200">
                    <th className="w-[22%] py-2 pr-2">Día</th>
                    <th className="py-2 pr-2">6:00 AM</th>
                    <th className="py-2 pr-2">8:00 AM</th>
                    <th className="py-2 pr-2">6:00 PM</th>
                    <th className="py-2 pr-0">8:00 PM</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [
                      "Lunes",
                      "Funcional",
                      "Spinning",
                      "Crossfit",
                      "Hipertrofia",
                    ],
                    [
                      "Martes",
                      "Boxeo Fitness",
                      "Spinning",
                      "Funcional",
                      "Yoga Recovery",
                    ],
                    [
                      "Miércoles",
                      "Funcional",
                      "Hipertrofia",
                      "Crossfit",
                      "Boxeo Fitness",
                    ],
                    [
                      "Jueves",
                      "Spinning",
                      "Yoga Recovery",
                      "Hipertrofia",
                      "Crossfit",
                    ],
                    [
                      "Viernes",
                      "Funcional",
                      "Spinning",
                      "Crossfit",
                      "Open Gym",
                    ],
                  ].map((row) => (
                    <tr
                      key={row[0]}
                      className="border-b border-zinc-800 text-zinc-200"
                    >
                      {row.map((cell, cellIndex) => (
                        <td
                          key={`${row[0]}-${cellIndex}`}
                          className={`py-2 pr-2 align-top wrap-break-word ${
                            cellIndex === 0 ? "font-semibold text-cyan-100" : ""
                          }`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="neon-card min-w-0 rounded-2xl bg-zinc-950/70 p-6 md:p-8">
            <div className="min-w-0">
              <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">
                Reserva tu clase
              </p>
              <h3 className="mt-2 text-xl font-semibold sm:text-2xl">
                Asegura tu lugar hoy
              </h3>
              <p className="mt-3 wrap-break-word text-sm leading-relaxed text-zinc-300 sm:text-base">
                Agenda por WhatsApp y recibe una recomendación de programa según
                tu objetivo actual.
              </p>
            </div>
            <a
              href="https://wa.me/5215512345678?text=Hola%20quiero%20reservar%20una%20clase%20en%20IRONCORE%20GYM"
              target="_blank"
              rel="noreferrer"
              className="neon-btn mt-6 inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-center text-sm font-semibold"
            >
              Reservar por WhatsApp
            </a>
          </aside>
        </div>
      </section>

      <section
        id="transformaciones"
        className="diagonal-section relative z-10 py-16 md:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">
            Transformaciones
          </p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl md:text-4xl">
            Historias antes y después que inspiran
          </h2>

          <div className="mt-8 grid gap-6">
            {[
              {
                nombre: "Andrea · -12kg en 4 meses",
                texto:
                  "Comenzó con miedo al cardio y hoy completa sesiones funcionales de alta intensidad. El cambio físico vino acompañado de confianza, energía y disciplina diaria.",
                antes:
                  "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=900&q=80",
                despues:
                  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80",
              },
              {
                nombre: "Luis · +8kg masa muscular",
                texto:
                  "Con un plan de hipertrofia y seguimiento de cargas, logró desarrollar fuerza, postura y volumen limpio sin comprometer movilidad.",
                antes:
                  "https://images.unsplash.com/photo-1483721310020-03333e577078?auto=format&fit=crop&w=900&q=80",
                despues:
                  "https://images.unsplash.com/photo-1605296867424-35fc25c9212a?auto=format&fit=crop&w=900&q=80",
              },
              {
                nombre: "Carla · recuperación y rendimiento",
                texto:
                  "Después de una pausa larga, volvió de forma progresiva con entrenamiento personalizado y hoy mantiene constancia, fuerza y equilibrio físico.",
                antes:
                  "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80",
                despues:
                  "https://images.unsplash.com/photo-1550345332-09e3ac987658?auto=format&fit=crop&w=900&q=80",
              },
            ].map((caso) => (
              <article
                key={caso.nombre}
                className="neon-card rounded-2xl bg-zinc-950/65 p-5 md:p-6"
              >
                <div className="grid gap-4 md:grid-cols-[1fr_1fr_1.1fr]">
                  <Image
                    loader={imageLoader}
                    unoptimized
                    src={caso.antes}
                    alt={`Antes de ${caso.nombre}`}
                    width={900}
                    height={900}
                    className="h-56 w-full rounded-xl object-cover"
                  />
                  <Image
                    loader={imageLoader}
                    unoptimized
                    src={caso.despues}
                    alt={`Después de ${caso.nombre}`}
                    width={900}
                    height={900}
                    className="h-56 w-full rounded-xl object-cover"
                  />
                  <div className="flex flex-col justify-center">
                    <h3 className="text-xl font-semibold text-cyan-200">
                      {caso.nombre}
                    </h3>
                    <p className="mt-3 text-zinc-300">{caso.texto}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="planes" className="relative z-10 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="text-sm uppercase tracking-[0.25em] text-fuchsia-300">
            Planes
          </p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl md:text-4xl">
            Elige tu nivel y acelera tus resultados
          </h2>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {[
              {
                nombre: "Starter",
                precio: "$39/mes",
                beneficios: [
                  "Acceso general",
                  "3 clases por semana",
                  "Evaluación inicial",
                ],
              },
              {
                nombre: "Pro",
                precio: "$69/mes",
                beneficios: [
                  "Acceso 24/7",
                  "Clases ilimitadas",
                  "Seguimiento mensual",
                  "Plan nutricional base",
                ],
                destacado: true,
              },
              {
                nombre: "Elite",
                precio: "$99/mes",
                beneficios: [
                  "Acceso 24/7 + VIP",
                  "Entrenamiento personalizado",
                  "Recovery Zone",
                  "Prioridad en reservas",
                ],
              },
            ].map((plan) => (
              <article
                key={plan.nombre}
                className={`rounded-2xl bg-zinc-950/70 p-6 ${
                  plan.destacado
                    ? "pro-plan-border shadow-[0_0_30px_rgba(34,211,238,0.22)]"
                    : "neon-card"
                }`}
              >
                <p className="text-sm uppercase tracking-[0.2em] text-zinc-300">
                  {plan.nombre}
                </p>
                <p className="mt-3 text-4xl font-black text-cyan-200">
                  {plan.precio}
                </p>
                <ul className="mt-5 space-y-3">
                  {plan.beneficios.map((beneficio) => (
                    <li
                      key={beneficio}
                      className="flex items-start gap-2 text-zinc-200"
                    >
                      <CheckCircle2
                        className="mt-0.5 text-emerald-300"
                        size={18}
                      />
                      <span>{beneficio}</span>
                    </li>
                  ))}
                </ul>
                <button className="neon-btn mt-6 w-full rounded-xl px-5 py-3 text-sm font-semibold">
                  Elegir {plan.nombre}
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="diagonal-section relative z-10 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">
            Equipamiento Premium
          </p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl md:text-4xl">
            Tecnología de entrenamiento de última generación
          </h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              "TitanForge Systems",
              "PulseVector Labs",
              "AeroSpin Dynamics",
              "NeoStrength Works",
            ].map((marca) => (
              <div
                key={marca}
                className="neon-card rounded-xl bg-zinc-950/70 p-5 text-center"
              >
                <Dumbbell className="mx-auto mb-3 text-cyan-300" />
                <p className="font-semibold text-zinc-100">{marca}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">
            Resultados medibles
          </p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl md:text-4xl">
            Indicadores visuales de progreso
          </h2>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {[
              { nombre: "Resistencia cardiovascular", progreso: "86%" },
              { nombre: "Fuerza máxima", progreso: "78%" },
              { nombre: "Reducción de grasa corporal", progreso: "69%" },
              { nombre: "Constancia semanal", progreso: "92%" },
            ].map((item) => (
              <div
                key={item.nombre}
                className="neon-card rounded-2xl bg-zinc-950/65 p-5"
              >
                <div className="mb-2 flex items-center justify-between text-sm text-zinc-300">
                  <span>{item.nombre}</span>
                  <span className="text-cyan-200">{item.progreso}</span>
                </div>
                <div className="h-3 rounded-full bg-zinc-800">
                  <div
                    className="h-3 rounded-full bg-linear-to-r from-cyan-400 via-violet-500 to-emerald-400 shadow-[0_0_18px_rgba(34,211,238,0.65)]"
                    style={{ width: item.progreso }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="trainers"
        className="diagonal-section relative z-10 py-16 md:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="text-sm uppercase tracking-[0.25em] text-fuchsia-300">
            Entrenadores
          </p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl md:text-4xl">
            Especialistas que elevan tu nivel
          </h2>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              {
                nombre: "Marco Reyes",
                especialidad: "Fuerza y acondicionamiento",
                cert: "Certificación NSCA-CPT",
                foto: "https://images.unsplash.com/photo-1567013127542-490d757e51fc?auto=format&fit=crop&w=900&q=80",
              },
              {
                nombre: "Valeria Soto",
                especialidad: "HIIT y recomposición corporal",
                cert: "Certificación ISSA Elite Trainer",
                foto: "https://images.unsplash.com/photo-1594381898411-846e7d193883?auto=format&fit=crop&w=900&q=80",
              },
              {
                nombre: "Diego Núñez",
                especialidad: "Crossfit y rendimiento atlético",
                cert: "Certificación CrossFit Level 2",
                foto: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=900&q=80",
              },
            ].map((coach) => (
              <article
                key={coach.nombre}
                className="neon-card rounded-2xl bg-zinc-950/70 p-5"
              >
                <Image
                  loader={imageLoader}
                  unoptimized
                  src={coach.foto}
                  alt={coach.nombre}
                  width={900}
                  height={1100}
                  className="h-64 w-full rounded-xl object-cover"
                />
                <h3 className="mt-4 text-xl font-semibold text-cyan-200">
                  {coach.nombre}
                </h3>
                <p className="mt-2 text-zinc-200">{coach.especialidad}</p>
                <p className="mt-1 text-sm text-emerald-300">{coach.cert}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="relative z-10 py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">
            FAQ
          </p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl md:text-4xl">
            Preguntas frecuentes sobre entrenamiento y membresías
          </h2>

          <div className="mt-8 space-y-4">
            {faqItems.map((item, index) => (
              <article
                key={item.pregunta}
                className="neon-card rounded-2xl bg-zinc-950/70"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-semibold text-zinc-100">
                    {item.pregunta}
                  </span>
                  <span className="text-cyan-300">
                    {openFaq === index ? "−" : "+"}
                  </span>
                </button>
                {openFaq === index && (
                  <p className="px-5 pb-5 text-zinc-300">{item.respuesta}</p>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="contact"
        className="diagonal-section relative z-10 py-16 md:py-24"
      >
        <div className="mx-auto grid max-w-7xl gap-8 px-4 md:grid-cols-2 md:px-8">
          <div className="neon-card rounded-2xl bg-zinc-950/70 p-6 md:p-8">
            <p className="text-sm uppercase tracking-[0.2em] text-fuchsia-300">
              Contacto
            </p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
              Hablemos de tu próximo cambio
            </h2>

            <form className="mt-6 space-y-4">
              <input
                type="text"
                placeholder="Nombre"
                className="w-full rounded-xl border border-cyan-500/30 bg-black/50 px-4 py-3 text-zinc-100 outline-none transition focus:border-cyan-300"
              />
              <input
                type="tel"
                placeholder="Teléfono"
                className="w-full rounded-xl border border-cyan-500/30 bg-black/50 px-4 py-3 text-zinc-100 outline-none transition focus:border-cyan-300"
              />
              <select className="w-full rounded-xl border border-cyan-500/30 bg-black/50 px-4 py-3 text-zinc-100 outline-none transition focus:border-cyan-300">
                <option>Objetivo</option>
                <option>Bajar grasa</option>
                <option>Ganar masa muscular</option>
                <option>Mejorar rendimiento</option>
                <option>Rehabilitación y movilidad</option>
              </select>
              <textarea
                placeholder="Mensaje"
                rows={4}
                className="w-full rounded-xl border border-cyan-500/30 bg-black/50 px-4 py-3 text-zinc-100 outline-none transition focus:border-cyan-300"
              />
              <button
                type="button"
                className="neon-btn w-full rounded-xl px-5 py-3 font-semibold"
              >
                Enviar solicitud
              </button>
            </form>
          </div>

          <aside className="neon-card rounded-2xl bg-zinc-950/70 p-6 md:p-8">
            <h3 className="text-2xl font-semibold text-cyan-200">
              Información IRONCORE GYM
            </h3>
            <ul className="mt-5 space-y-3 text-zinc-300">
              <li>Dirección: Av. Fuerza 909, Zona Centro</li>
              <li>Horarios: Lunes a Viernes 5:30 AM - 10:30 PM</li>
              <li>Sábado: 7:00 AM - 5:00 PM · Domingo: 8:00 AM - 2:00 PM</li>
              <li>Redes: @ironcoregym en Instagram, TikTok y Facebook</li>
            </ul>

            <a
              href="https://wa.me/5215512345678?text=Hola%2C%20vi%20la%20demo%20IRONCORE%20GYM%20y%20quiero%20cotizar%20una%20p%C3%A1gina%20web%20para%20mi%20gimnasio."
              target="_blank"
              rel="noreferrer"
              className="neon-btn mt-7 inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-center font-semibold"
            >
              Cotizar por WhatsApp
            </a>
          </aside>
        </div>
      </section>

      <footer className="relative z-10 border-t border-cyan-500/20 bg-black/80 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 md:flex-row md:items-center md:justify-between md:px-8">
          <p className="text-sm text-zinc-400">
            © 2026 IRONCORE GYM. Entrena para dominar tu versión futura.
          </p>
          <div className="flex flex-wrap gap-3 text-sm text-zinc-300">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="rounded-md px-1 py-0.5 hover:text-cyan-300"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      </footer>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-cyan-400/35 bg-black/90 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col items-stretch justify-between gap-3 px-1 md:flex-row md:items-center md:gap-4 md:px-4">
          <p className="text-center text-sm text-zinc-200 sm:text-left md:text-base">
            Comienza hoy. Tu primera sesión puede cambiarlo todo.
          </p>
          <a
            href="https://wa.me/5215512345678?text=Hola%20quiero%20mi%20clase%20gratis%20en%20IRONCORE%20GYM"
            target="_blank"
            rel="noreferrer"
            className="neon-btn w-full shrink-0 rounded-xl px-4 py-2 text-center text-sm font-semibold md:w-auto md:px-6"
          >
            Clase Gratis
          </a>
        </div>
      </div>

      <a
        href="https://wa.me/5215512345678?text=Hola%2C%20vi%20la%20demo%20IRONCORE%20GYM%20y%20quiero%20cotizar%20una%20p%C3%A1gina%20web%20para%20mi%20gimnasio."
        target="_blank"
        rel="noreferrer"
        className="neon-float fixed bottom-32 right-3 z-50 rounded-full px-5 py-3 text-sm font-bold text-black md:bottom-24 md:right-8"
      >
        WhatsApp
      </a>

      <style jsx global>{`
        .cyber-grid {
          background-image:
            linear-gradient(rgba(34, 211, 238, 0.07) 1px, transparent 1px),
            linear-gradient(
              90deg,
              rgba(168, 85, 247, 0.06) 1px,
              transparent 1px
            ),
            radial-gradient(
              circle at 20% 10%,
              rgba(34, 211, 238, 0.08),
              transparent 35%
            ),
            radial-gradient(
              circle at 80% 70%,
              rgba(16, 185, 129, 0.09),
              transparent 35%
            );
          background-size:
            48px 48px,
            48px 48px,
            100% 100%,
            100% 100%;
        }

        .diagonal-section {
          position: relative;
          isolation: isolate;
        }

        .diagonal-section::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          background: linear-gradient(
            120deg,
            rgba(7, 10, 18, 0.92) 0%,
            rgba(15, 23, 42, 0.72) 100%
          );
          clip-path: polygon(0 6%, 100% 0, 100% 94%, 0 100%);
          border-top: 1px solid rgba(34, 211, 238, 0.15);
          border-bottom: 1px solid rgba(168, 85, 247, 0.2);
        }

        .neon-btn {
          position: relative;
          border: 1px solid rgba(34, 211, 238, 0.6);
          background: linear-gradient(
            135deg,
            rgba(6, 182, 212, 0.15),
            rgba(168, 85, 247, 0.2)
          );
          color: #e2f8ff;
          box-shadow: 0 0 0 rgba(34, 211, 238, 0.4);
          animation: neonPulse 2.6s ease-in-out infinite;
          overflow: hidden;
        }

        .neon-btn::after {
          content: "";
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(
            120deg,
            rgba(34, 211, 238, 0.9),
            rgba(168, 85, 247, 0.9),
            rgba(16, 185, 129, 0.8)
          );
          -webkit-mask:
            linear-gradient(#000 0 0) content-box,
            linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: borderRun 2.8s linear infinite;
          pointer-events: none;
        }

        .neon-btn:hover {
          box-shadow:
            0 0 26px rgba(34, 211, 238, 0.45),
            0 0 44px rgba(168, 85, 247, 0.32);
          transform: translateY(-1px);
        }

        .neon-card {
          border: 1px solid rgba(34, 211, 238, 0.28);
          transition:
            box-shadow 0.3s ease,
            border-color 0.3s ease,
            transform 0.3s ease;
          animation: fadeInUp 0.6s ease both;
        }

        .neon-card:hover {
          border-color: rgba(34, 211, 238, 0.75);
          box-shadow:
            0 0 22px rgba(34, 211, 238, 0.3),
            0 0 38px rgba(16, 185, 129, 0.2);
          transform: translateY(-3px);
        }

        .pro-plan-border {
          position: relative;
          border: 1px solid transparent;
          background:
            linear-gradient(rgba(9, 9, 11, 0.82), rgba(9, 9, 11, 0.82))
              padding-box,
            linear-gradient(
                120deg,
                rgba(34, 211, 238, 0.9),
                rgba(168, 85, 247, 0.95),
                rgba(16, 185, 129, 0.85)
              )
              border-box;
          animation: borderRun 4s linear infinite;
        }

        .neon-float {
          background: linear-gradient(135deg, #22d3ee, #a855f7 55%, #10b981);
          box-shadow:
            0 0 22px rgba(34, 211, 238, 0.55),
            0 0 38px rgba(168, 85, 247, 0.35);
          transition: transform 0.25s ease;
        }

        .neon-float:hover {
          transform: translateY(-2px) scale(1.02);
        }

        @keyframes neonPulse {
          0%,
          100% {
            box-shadow: 0 0 0 rgba(34, 211, 238, 0.2);
          }
          50% {
            box-shadow:
              0 0 22px rgba(34, 211, 238, 0.35),
              0 0 34px rgba(168, 85, 247, 0.28);
          }
        }

        @keyframes borderRun {
          0% {
            filter: hue-rotate(0deg);
          }
          100% {
            filter: hue-rotate(360deg);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}
