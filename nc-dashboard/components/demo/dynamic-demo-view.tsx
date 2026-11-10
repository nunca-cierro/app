"use client";

import Image from "next/image";
import { useState, useMemo } from "react";
import {
  Instagram,
  MapPin,
  Menu,
  Phone,
  Sparkles,
  X,
  Check,
  ShieldCheck,
} from "lucide-react";
import { DemoChatWidget } from "@/components/demo/demo-chat-widget";
import type { DemoProfile } from "@/lib/demos-config";

const imageLoader = ({ src }: { src: string }) => src;

const navItems = [
  { label: "Inicio", id: "home" },
  { label: "Servicios", id: "services" },
  { label: "Paquetes", id: "packages" },
  { label: "Galería", id: "gallery" },
  { label: "Antes y después", id: "beforeafter" },
  { label: "Reseñas", id: "testimonials" },
  { label: "FAQ", id: "faq" },
  { label: "Contacto", id: "contact" },
];

interface DynamicDemoViewProps {
  profile: DemoProfile;
  isCustom?: boolean;
}

export function DynamicDemoView({ profile }: DynamicDemoViewProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const cleanPhone = useMemo(
    () => profile.whatsappNumber.replace(/[^0-9]/g, ""),
    [profile.whatsappNumber],
  );

  const openSimulator = () => {
    setIsChatOpen(true);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    const headerOffset = 130;
    const elementTop = element.getBoundingClientRect().top + window.scrollY;
    const target = elementTop - headerOffset;
    window.scrollTo({ top: target, behavior: "smooth" });
  };

  const onNavClick = (id: string) => {
    scrollToSection(id);
    setIsMenuOpen(false);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-rose-50 via-white to-amber-50 text-zinc-800">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(251,207,232,0.35),transparent_35%),radial-gradient(circle_at_20%_20%,rgba(253,230,138,0.25),transparent_30%)]" />

      {/* Top Banner sutil de demostración personalizada */}
      <aside
        aria-label="Aviso de demostración"
        className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 border-b border-amber-500/20 bg-zinc-950/95 px-4 py-2 text-center text-xs font-medium text-white shadow-md backdrop-blur-md"
      >
        <Sparkles className="size-3.5 text-amber-400 shrink-0" />
        <span>
          Demostración personalizada para{" "}
          <strong className="font-semibold text-amber-300">
            {profile.businessName}
          </strong>{" "}
          <span className="hidden sm:inline">| Impulsado por Nunca Cierro</span>
        </span>
      </aside>

      {/* Header flotante */}
      <header className="fixed left-1/2 top-12 z-40 w-[calc(100%-1.5rem)] max-w-5xl -translate-x-1/2">
        <div className="gold-soft-glow flex items-center justify-between rounded-2xl border border-rose-100/70 bg-white/80 px-4 py-3 shadow-lg backdrop-blur-md md:px-6">
          <button
            onClick={() => onNavClick("home")}
            className="text-left"
            aria-label={`Ir al inicio de ${profile.businessName}`}
          >
            <p className="font-serif text-lg tracking-wide text-rose-500 font-semibold">
              {profile.businessName}
            </p>
            <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
              {profile.brandAccent}
            </p>
          </button>

          <nav className="hidden items-center gap-5 md:flex" aria-label="Navegación principal">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavClick(item.id)}
                className="text-sm font-medium text-zinc-600 transition hover:text-rose-500"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavClick("contact")}
              className="hidden rounded-full bg-rose-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 md:inline-flex"
            >
              Reservar cita
            </button>
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="inline-flex size-10 items-center justify-center rounded-full border border-rose-100 bg-white text-zinc-700 md:hidden"
              aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
            >
              {isMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-zinc-900/40 p-4 pt-32 backdrop-blur-sm md:hidden">
          <div className="fade-up mx-auto max-w-sm rounded-3xl border border-rose-100 bg-white/95 p-6 shadow-2xl">
            <p className="mb-4 text-xs uppercase tracking-[0.24em] text-rose-400">Menú</p>
            <div className="space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavClick(item.id)}
                  className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-zinc-700 transition hover:bg-rose-50"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setIsMenuOpen(false);
                openSimulator();
              }}
              className="mt-5 w-full rounded-full bg-rose-500 px-5 py-3 text-sm font-semibold text-white"
            >
              Probar Asistente WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-36 md:px-8 md:pt-40">
        {/* Hero Section */}
        <section id="home" className="fade-up mb-20">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            <ShieldCheck className="size-3.5 text-amber-600" />
            Atención Médica Certificada y Valoración Personalizada
          </div>

          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <p className="mb-4 text-xs uppercase tracking-[0.3em] text-rose-400">
                {profile.eyebrow}
              </p>
              <h1 className="text-4xl font-semibold leading-tight text-zinc-900 md:text-5xl">
                {profile.title}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-600">
                {profile.subtitle}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={() => onNavClick("services")}
                  className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  Ver Tratamientos
                </button>
                <button
                  onClick={openSimulator}
                  className="rounded-full border border-rose-200 bg-white px-6 py-3 text-sm font-semibold text-rose-500 transition hover:border-rose-300 hover:bg-rose-50"
                >
                  Probar Asistente WhatsApp
                </button>
              </div>

              <div
                onClick={openSimulator}
                className="mt-8 inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-rose-100 bg-white/70 px-5 py-3 backdrop-blur-sm transition hover:bg-white hover:shadow-md"
              >
                <div className="rounded-full bg-emerald-100 p-2 text-emerald-600">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-900">
                    Asistente WhatsApp 24/7 disponible
                  </p>
                  <p className="text-xs text-zinc-500">
                    Haz clic aquí para interactuar con el bot en vivo
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="gold-soft-glow relative aspect-[4/5] overflow-hidden rounded-3xl border border-rose-100 shadow-2xl">
                <Image
                  src={profile.galleryImages[0] || "https://images.unsplash.com/photo-1512290900672-1f4fbe299099?auto=format&fit=crop&w=900&q=80"}
                  alt={profile.businessName}
                  fill
                  loader={imageLoader}
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="mb-20 scroll-mt-28">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-rose-400">
              Procedimientos y Especialidades
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-zinc-900 md:text-4xl">
              Tratamientos diseñados a tu medida
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
              Diagnóstico preciso, insumos de alta gama y seguimiento cercano en cada etapa.
            </p>
          </div>

          {/* Chips list */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {profile.serviceChips.map((chip, index) => (
              <span
                key={index}
                className="rounded-full border border-rose-100 bg-white/80 px-4 py-2 text-xs font-medium text-zinc-700 shadow-xs"
              >
                {chip}
              </span>
            ))}
          </div>

          {/* Service Cards Grid */}
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {profile.services.map((service, index) => (
              <div
                key={index}
                className="premium-hover rounded-3xl border border-rose-100 bg-white/80 p-6 shadow-sm backdrop-blur-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                    <Sparkles className="size-4" />
                  </div>
                  {service.price && (
                    <span className="text-xs font-semibold text-rose-500">
                      {service.price}
                    </span>
                  )}
                </div>
                <h3 className="mt-4 text-base font-semibold text-zinc-900">
                  {service.title}
                </h3>
                {service.description && (
                  <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                    {service.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Packages Section */}
        <section id="packages" className="mb-20 scroll-mt-28">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-rose-400">
              Protocolos Integrales
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-zinc-900 md:text-4xl">
              Planes con resultados garantizados
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {profile.packages.map((pkg, index) => (
              <div
                key={index}
                className={`relative rounded-3xl p-6 transition backdrop-blur-sm ${
                  pkg.featured
                    ? "border-2 border-rose-400 bg-white shadow-xl scale-[1.02]"
                    : "border border-rose-100 bg-white/75 shadow-sm"
                }`}
              >
                {pkg.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-rose-500 px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
                    Tratamiento Destacado
                  </span>
                )}
                <h3 className="text-xl font-semibold text-zinc-900">{pkg.name}</h3>
                <p className="mt-2 text-2xl font-bold text-rose-500">{pkg.price}</p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-600">{pkg.description}</p>
                <ul className="mt-6 space-y-2.5 text-xs text-zinc-700 border-t border-rose-50 pt-4">
                  {pkg.includes.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="size-3.5 text-rose-500 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={openSimulator}
                  className={`mt-6 w-full rounded-full py-2.5 text-xs font-semibold transition ${
                    pkg.featured
                      ? "bg-rose-500 text-white hover:bg-rose-600"
                      : "border border-rose-200 bg-white text-zinc-800 hover:bg-rose-50"
                  }`}
                >
                  Consultar protocolo en WhatsApp
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Gallery Section */}
        <section id="gallery" className="mb-20 scroll-mt-28">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-rose-400">Instalaciones & Casos</p>
            <h2 className="mt-2 text-3xl font-semibold text-zinc-900 md:text-4xl">
              Nuestra clínica y resultados
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {profile.galleryImages.map((src, index) => (
              <div
                key={index}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-rose-100 bg-zinc-100 shadow-sm"
              >
                <Image
                  src={src}
                  alt={`Galería ${profile.businessName} ${index + 1}`}
                  fill
                  loader={imageLoader}
                  className="object-cover transition duration-300 group-hover:scale-105"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Before and After Section */}
        <section id="beforeafter" className="mb-20 scroll-mt-28">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-rose-400">Evolución Clínica</p>
            <h2 className="mt-2 text-3xl font-semibold text-zinc-900 md:text-4xl">
              Casos reales de armonización
            </h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {profile.beforeAfterCases.map((c, index) => (
              <article
                key={index}
                className="overflow-hidden rounded-3xl border border-rose-100 bg-white p-4 shadow-sm"
              >
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-zinc-100">
                    <Image
                      src={c.before}
                      alt={`${c.title} Antes`}
                      fill
                      loader={imageLoader}
                      className="object-cover"
                    />
                    <span className="absolute bottom-2 left-2 rounded-md bg-zinc-900/70 px-2 py-0.5 text-[10px] font-medium text-white">
                      Antes
                    </span>
                  </div>
                  <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-zinc-100">
                    <Image
                      src={c.after}
                      alt={`${c.title} Después`}
                      fill
                      loader={imageLoader}
                      className="object-cover"
                    />
                    <span className="absolute bottom-2 left-2 rounded-md bg-rose-500/90 px-2 py-0.5 text-[10px] font-medium text-white">
                      Después
                    </span>
                  </div>
                </div>
                <h3 className="mt-3 text-center text-sm font-semibold text-zinc-800">
                  {c.title}
                </h3>
              </article>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="mb-20 scroll-mt-28">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-rose-400">Opiniones</p>
            <h2 className="mt-2 text-3xl font-semibold text-zinc-900 md:text-4xl">
              Lo que opinan nuestros pacientes
            </h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {profile.testimonials.map((t, index) => (
              <div
                key={index}
                className="rounded-3xl border border-rose-100 bg-white/80 p-6 shadow-sm backdrop-blur-sm"
              >
                <div className="flex gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Sparkles key={i} className="size-3.5 fill-amber-400" />
                  ))}
                </div>
                <p className="mt-4 text-xs leading-relaxed text-zinc-600">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="mt-4 border-t border-rose-50 pt-3">
                  <p className="text-xs font-semibold text-zinc-900">{t.name}</p>
                  <p className="text-[11px] text-rose-500">{t.service}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="mb-20 scroll-mt-28">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-rose-400">Preguntas Frecuentes</p>
            <h2 className="mt-2 text-3xl font-semibold text-zinc-900 md:text-4xl">
              Dudas comunes resueltas
            </h2>
          </div>
          <div className="mx-auto mt-10 max-w-3xl space-y-3">
            {profile.faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl border border-rose-100 bg-white/80 p-5 shadow-xs backdrop-blur-sm"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex w-full items-center justify-between text-left text-sm font-semibold text-zinc-900"
                    aria-expanded={isOpen}
                  >
                    <span>{faq.question}</span>
                    <span className="text-rose-400 font-bold ml-2">
                      {isOpen ? "-" : "+"}
                    </span>
                  </button>
                  {isOpen && (
                    <p className="mt-3 text-xs leading-relaxed text-zinc-600">
                      {faq.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="mb-14 scroll-mt-28">
          <div className="grid gap-8 rounded-3xl border border-rose-100 bg-white/80 p-6 backdrop-blur-sm md:p-8 lg:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-rose-400">Contacto Directo</p>
              <h2 className="mt-2 text-3xl font-semibold text-zinc-900">
                Reserva tu cita de valoración
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                Cuéntanos qué tratamiento deseas evaluar y coordinamos tu horario con el especialista.
              </p>
              <div className="mt-6 space-y-4 text-sm text-zinc-700">
                <p className="flex items-center gap-2">
                  <MapPin className="size-4 text-rose-400 shrink-0" />
                  <span>{profile.address}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="size-4 text-rose-400 shrink-0" />
                  <span>{profile.phone}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Instagram className="size-4 text-rose-400 shrink-0" />
                  <span>{profile.instagram}</span>
                </p>
                <p className="text-xs text-zinc-500">
                  Horario de atención: {profile.schedule}
                </p>
              </div>
              <button
                type="button"
                onClick={openSimulator}
                className="mt-6 inline-flex rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
              >
                Simular chat de WhatsApp
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                openSimulator();
              }}
              className="space-y-3"
            >
              <input
                type="text"
                placeholder="Nombre completo"
                required
                className="w-full rounded-xl border border-rose-100 bg-white px-4 py-3 text-xs outline-none transition focus:border-rose-300"
              />
              <input
                type="tel"
                placeholder="Teléfono móvil"
                required
                className="w-full rounded-xl border border-rose-100 bg-white px-4 py-3 text-xs outline-none transition focus:border-rose-300"
              />
              <input
                type="text"
                placeholder="Tratamiento de interés"
                className="w-full rounded-xl border border-rose-100 bg-white px-4 py-3 text-xs outline-none transition focus:border-rose-300"
              />
              <textarea
                placeholder="Comentarios adicionales"
                rows={3}
                className="w-full rounded-xl border border-rose-100 bg-white px-4 py-3 text-xs outline-none transition focus:border-rose-300"
              />
              <button
                type="submit"
                className="w-full rounded-full bg-zinc-900 px-6 py-3 text-xs font-semibold text-white transition hover:bg-zinc-800"
              >
                Enviar y probar bot en vivo
              </button>
            </form>
          </div>
        </section>

        {/* Benefit Highlight Box */}
        <section className="mb-16">
          <div className="gold-soft-glow rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 via-rose-50 to-pink-50 p-8 text-center md:p-12">
            <p className="text-xs uppercase tracking-[0.24em] text-amber-700">
              {profile.benefitBox.eyebrow}
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-zinc-900 md:text-3xl">
              {profile.benefitBox.title}
            </h3>
            <button
              onClick={openSimulator}
              className="mt-6 rounded-full bg-zinc-900 px-7 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              {profile.benefitBox.ctaText}
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-rose-100 py-8 text-center text-xs text-zinc-500">
          <p>
            {profile.businessName} &copy; {new Date().getFullYear()} &middot; {profile.categoryName}
          </p>
          <p className="mt-1 text-[11px] text-zinc-400">
            Demostración tecnológica operada con la plataforma Nunca Cierro
          </p>
        </footer>
      </main>

      {/* Floating Interactive WhatsApp Simulator */}
      <DemoChatWidget
        businessName={profile.businessName}
        categoryName={profile.categoryName}
        services={profile.services}
        faqs={profile.faqs}
        whatsappNumber={cleanPhone}
        schedule={profile.schedule}
        address={profile.address}
        isOpenControlled={isChatOpen}
        onOpenChange={setIsChatOpen}
      />

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
        .fade-up {
          animation: fadeUp 0.65s ease both;
        }
        .premium-hover {
          transition: transform 0.28s ease, box-shadow 0.28s ease;
        }
        .premium-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 14px 35px rgba(236, 72, 153, 0.12);
        }
        .gold-soft-glow {
          box-shadow: 0 8px 25px rgba(251, 191, 36, 0.2), 0 4px 12px rgba(251, 113, 133, 0.1);
        }
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

