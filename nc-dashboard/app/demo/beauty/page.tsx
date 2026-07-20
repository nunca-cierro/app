"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Instagram, MapPin, Menu, Phone, Sparkles, X } from "lucide-react";

const imageLoader = ({ src }: { src: string }) => src;

type FaqItem = {
  question: string;
  answer: string;
};

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

const serviceItems = [
  "Corte y diseño personalizado",
  "Coloración balayage premium",
  "Maquillaje social HD",
  "Peinados para eventos",
  "Lifting de pestañas",
  "Diseño y laminado de cejas",
  "Tratamiento capilar nutritivo",
  "Manicure spa nude",
];

const packageItems = [
  {
    name: "Glow Basic",
    price: ".900",
    description: "Ideal para un refresh elegante entre semana.",
    includes: ["Limpieza facial express", "Peinado suave", "Brillo capilar"],
    featured: false,
  },
  {
    name: "Glam Premium",
    price: ".900",
    description: "Look completo para destacar en cualquier ocasión.",
    includes: ["Maquillaje HD", "Peinado editorial", "Diseño de cejas"],
    featured: false,
  },
  {
    name: "Bridal VIP",
    price: ".900",
    description: "Experiencia boutique exclusiva para novias.",
    includes: ["Prueba previa", "Maquillaje + peinado", "Touch-up kit"],
    featured: true,
  },
];

const galleryImages = [
  "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1498842812179-c81beecf902c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1457972729786-0411a3b2b626?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1554519934-e32b1629d9ee?auto=format&fit=crop&w=900&q=80",
];

const beforeAfterCases = [
  {
    title: "Cambio de look glow",
    before: "https://images.unsplash.com/photo-1523263685509-57c1d050d19b?auto=format&fit=crop&w=900&q=80",
    after: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Maquillaje social premium",
    before: "https://images.unsplash.com/photo-1526045612212-70caf35c14df?auto=format&fit=crop&w=900&q=80",
    after: "https://images.unsplash.com/photo-1509783236416-c9ad59bae472?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Novia Bridal VIP",
    before: "https://images.unsplash.com/photo-1470259078422-826894b933aa?auto=format&fit=crop&w=900&q=80",
    after: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=900&q=80",
  },
];

const testimonials = [
  {
    name: "Camila R.",
    service: "Balayage premium",
    text: "Salí sintiéndome espectacular. El color quedó fino y súper natural.",
  },
  {
    name: "Valentina M.",
    service: "Maquillaje social HD",
    text: "Duró intacto toda la noche. El trato del equipo fue impecable.",
  },
  {
    name: "Francisca T.",
    service: "Bridal VIP",
    text: "Me acompañaron en todo el proceso, fue una experiencia hermosa.",
  },
];

const faqItems: FaqItem[] = [
  {
    question: "¿Cuánto dura el maquillaje?",
    answer: "Nuestro maquillaje profesional tiene una duración estimada de 10 a 14 horas según el tipo de piel y condiciones del evento.",
  },
  {
    question: "¿Trabajan con citas?",
    answer: "Sí, trabajamos principalmente con cita previa para ofrecer una atención personalizada y sin esperas.",
  },
  {
    question: "¿Qué incluye el paquete Bridal?",
    answer: "Incluye prueba previa, asesoría de estilo, maquillaje y peinado del día, además de kit de retoque.",
  },
  {
    question: "¿Qué productos usan?",
    answer: "Trabajamos con líneas profesionales de alta gama, seleccionadas por su acabado, duración y cuidado de la piel.",
  },
];

export default function BeautyDemoPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const whatsappMessage = useMemo(
    () => encodeURIComponent("Hola, quiero cotizar una landing web premium para mi salón de belleza ✨"),
    [],
  );

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    const headerOffset = 110;
    const elementTop = element.getBoundingClientRect().top + window.scrollY;
    const target = elementTop - headerOffset;
    window.scrollTo({ top: target, behavior: "smooth" });
  };

  const onNavClick = (id: string) => {
    scrollToSection(id);
    setIsMenuOpen(false);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-linear-to-b from-rose-50 via-white to-amber-50 text-zinc-800">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(251,207,232,0.35),transparent_35%),radial-gradient(circle_at_20%_20%,rgba(253,230,138,0.25),transparent_30%)]" />

      <header className="fixed left-1/2 top-6 z-50 w-[calc(100%-1.5rem)] max-w-5xl -translate-x-1/2">
        <div className="gold-soft-glow flex items-center justify-between rounded-2xl border border-rose-100/70 bg-white/75 px-4 py-3 shadow-lg backdrop-blur-md md:px-6">
          <button onClick={() => onNavClick("home")} className="text-left" aria-label="Ir al inicio">
            <p className="font-serif text-lg tracking-wide text-rose-500">Atelier Belle</p>
            <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Beauty Boutique</p>
          </button>

          <nav className="hidden items-center gap-5 md:flex">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => onNavClick(item.id)} className="text-sm font-medium text-zinc-600 transition hover:text-rose-500">
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={() => onNavClick("contact")} className="hidden rounded-full bg-rose-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 md:inline-flex">
              Reservar cita
            </button>
            <button onClick={() => setIsMenuOpen((prev) => !prev)} className="inline-flex size-10 items-center justify-center rounded-full border border-rose-100 bg-white text-zinc-700 md:hidden" aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}>
              {isMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-zinc-900/40 p-4 pt-28 backdrop-blur-sm md:hidden">
          <div className="fade-up mx-auto max-w-sm rounded-3xl border border-rose-100 bg-white/95 p-6 shadow-2xl">
            <p className="mb-4 text-xs uppercase tracking-[0.24em] text-rose-400">Menú</p>
            <div className="space-y-2">
              {navItems.map((item) => (
                <button key={item.id} onClick={() => onNavClick(item.id)} className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-zinc-700 transition hover:bg-rose-50">
                  {item.label}
                </button>
              ))}
            </div>
            <button onClick={() => onNavClick("contact")} className="mt-5 w-full rounded-full bg-rose-500 px-5 py-3 text-sm font-semibold text-white">
              Reservar cita
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-32 md:px-8 md:pt-36">
        <section id="home" className="fade-up mb-20">
          <div className="mb-6 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">
            Promoción del mes · Alisado + hidratación con 20% OFF
          </div>

          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <p className="mb-4 text-xs uppercase tracking-[0.3em] text-rose-400">Beauty Atelier</p>
              <h1 className="text-4xl font-semibold leading-tight text-zinc-900 md:text-5xl">Belleza que se nota. Confianza que se siente.</h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-600">
                Creamos looks sofisticados y femeninos con un enfoque editorial, personalizado y delicado para que te veas increíble en cada momento especial.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <button onClick={() => onNavClick("services")} className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800">
                  Ver Servicios
                </button>
                <button onClick={() => onNavClick("contact")} className="rounded-full border border-rose-200 bg-white px-6 py-3 text-sm font-semibold text-rose-500 transition hover:border-rose-300 hover:bg-rose-50">
                  Reservar cita
                </button>
              </div>

              <div className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-rose-100 bg-white/70 px-5 py-3 backdrop-blur-sm">
                <Sparkles className="size-5 text-amber-500" />
                <div>
                  <p className="text-sm font-semibold text-zinc-800">★★★★★</p>
                  <p className="text-xs text-zinc-600">500+ clientas felices</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="gold-soft-glow overflow-hidden rounded-[2rem] border border-rose-100 bg-white p-2">
                <Image loader={imageLoader} unoptimized src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=80" alt="Modelo con maquillaje elegante" width={900} height={1200} className="h-[540px] w-full rounded-[1.5rem] object-cover" />
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="mb-20 scroll-mt-28">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.24em] text-rose-400">Servicios</p>
            <h2 className="mt-2 text-3xl font-semibold text-zinc-900">Experiencias de belleza premium</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {serviceItems.map((service) => (
              <article key={service} className="premium-hover rounded-2xl border border-rose-100 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
                <Sparkles className="mb-3 size-4 text-rose-400" />
                <p className="text-sm font-medium text-zinc-700">{service}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="packages" className="mb-20 scroll-mt-28">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.24em] text-rose-400">Paquetes</p>
            <h2 className="mt-2 text-3xl font-semibold text-zinc-900">Elige tu ritual ideal</h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {packageItems.map((pack) => (
              <article key={pack.name} className={`rounded-3xl border p-7 transition ${
                pack.featured
                  ? "gold-soft-glow border-amber-200 bg-linear-to-b from-amber-50 to-white"
                  : "border-rose-100 bg-white"
              }`}>
                {pack.featured && (
                  <span className="mb-4 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Más elegido
                  </span>
                )}
                <h3 className="text-2xl font-semibold text-zinc-900">{pack.name}</h3>
                <p className="mt-2 text-sm text-zinc-600">{pack.description}</p>
                <p className="mt-5 text-3xl font-bold text-zinc-900">{pack.price}</p>
                <ul className="mt-5 space-y-2 text-sm text-zinc-600">
                  {pack.includes.map((item) => <li key={item}>• {item}</li>)}
                </ul>
                <button onClick={() => onNavClick("contact")} className="mt-6 w-full rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800">
                  Elegir
                </button>
              </article>
            ))}
          </div>
        </section>

        <section id="gallery" className="mb-20 scroll-mt-28">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.24em] text-rose-400">Gallery</p>
            <h2 className="mt-2 text-3xl font-semibold text-zinc-900">Inspiración boutique</h2>
          </div>
          <div className="columns-2 gap-4 space-y-4 md:columns-3 lg:columns-4">
            {galleryImages.map((src, index) => (
              <Image loader={imageLoader} unoptimized key={src} src={src} alt={`Trabajo de belleza ${index + 1}`} width={900} height={1200} className="premium-hover h-auto w-full break-inside-avoid rounded-2xl border border-rose-100 object-cover" />
            ))}
          </div>
        </section>

        <section id="beforeafter" className="mb-20 scroll-mt-28">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.24em] text-rose-400">Before / After</p>
            <h2 className="mt-2 text-3xl font-semibold text-zinc-900">Transformaciones reales</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {beforeAfterCases.map((item) => (
              <article key={item.title} className="rounded-2xl border border-rose-100 bg-white p-4">
                <p className="mb-4 text-sm font-semibold text-zinc-800">{item.title}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Image loader={imageLoader} unoptimized src={item.before} alt={`${item.title} antes`} width={700} height={700} className="h-44 w-full rounded-xl object-cover" />
                    <p className="mt-2 text-center text-xs uppercase tracking-wider text-zinc-500">Antes</p>
                  </div>
                  <div>
                    <Image loader={imageLoader} unoptimized src={item.after} alt={`${item.title} después`} width={700} height={700} className="h-44 w-full rounded-xl object-cover" />
                    <p className="mt-2 text-center text-xs uppercase tracking-wider text-zinc-500">Después</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="testimonials" className="mb-20 scroll-mt-28">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.24em] text-rose-400">Testimonios</p>
            <h2 className="mt-2 text-3xl font-semibold text-zinc-900">Lo que dicen nuestras clientas</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {testimonials.map((item) => (
              <article key={item.name} className="rounded-2xl border border-rose-100 bg-white p-6">
                <p className="text-sm text-amber-500">★★★★★</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">"{item.text}"</p>
                <p className="mt-4 font-semibold text-zinc-900">{item.name}</p>
                <p className="text-xs uppercase tracking-wider text-zinc-500">{item.service}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="faq" className="mb-20 scroll-mt-28">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.24em] text-rose-400">FAQ</p>
            <h2 className="mt-2 text-3xl font-semibold text-zinc-900">Preguntas frecuentes</h2>
          </div>
          <div className="space-y-3">
            {faqItems.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <article key={item.question} className="rounded-2xl border border-rose-100 bg-white px-5 py-4">
                  <button onClick={() => setOpenFaq(isOpen ? null : index)} className="flex w-full items-center justify-between gap-4 text-left">
                    <span className="font-medium text-zinc-800">{item.question}</span>
                    <span className="text-xl text-rose-400">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen && <p className="mt-3 text-sm leading-relaxed text-zinc-600">{item.answer}</p>}
                </article>
              );
            })}
          </div>
        </section>

        <section id="contact" className="mb-14 scroll-mt-28">
          <div className="grid gap-8 rounded-3xl border border-rose-100 bg-white/80 p-6 backdrop-blur-sm md:p-8 lg:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-rose-400">Contacto</p>
              <h2 className="mt-2 text-3xl font-semibold text-zinc-900">Reserva tu momento de belleza</h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">Cuéntanos qué servicio deseas y te responderemos para confirmar disponibilidad.</p>
              <div className="mt-6 space-y-4 text-sm text-zinc-700">
                <p className="flex items-center gap-2"><MapPin className="size-4 text-rose-400" /> Av. Primavera 1234, Las Condes, Santiago</p>
                <p className="flex items-center gap-2"><Phone className="size-4 text-rose-400" /> +56 9 8765 4321</p>
                <p className="flex items-center gap-2"><Instagram className="size-4 text-rose-400" /> @atelierbelle.studio</p>
                <p className="text-zinc-600">Horario: Lun - Sáb · 09:00 a 20:00</p>
              </div>
              <a href={`https://wa.me/56987654321?text=${whatsappMessage}`} target="_blank" rel="noreferrer" className="mt-6 inline-flex rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600">
                Cotizar sitio web por WhatsApp
              </a>
            </div>

            <form className="space-y-4">
              <input type="text" placeholder="Nombre" className="w-full rounded-xl border border-rose-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-rose-300" />
              <input type="tel" placeholder="Teléfono" className="w-full rounded-xl border border-rose-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-rose-300" />
              <input type="text" placeholder="Servicio" className="w-full rounded-xl border border-rose-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-rose-300" />
              <input type="date" className="w-full rounded-xl border border-rose-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-rose-300" />
              <textarea placeholder="Mensaje" rows={4} className="w-full rounded-xl border border-rose-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-rose-300" />
              <button type="button" className="w-full rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800">
                Enviar solicitud
              </button>
            </form>
          </div>
        </section>

        <section className="mb-16">
          <div className="gold-soft-glow rounded-3xl border border-amber-200 bg-linear-to-r from-amber-50 via-rose-50 to-pink-50 p-8 text-center md:p-12">
            <p className="text-xs uppercase tracking-[0.24em] text-amber-700">Beneficio exclusivo</p>
            <h3 className="mt-3 text-3xl font-semibold text-zinc-900">Reserva hoy y recibe hidratación capilar gratis</h3>
            <button onClick={() => onNavClick("contact")} className="mt-6 rounded-full bg-zinc-900 px-7 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800">
              Quiero mi reserva
            </button>
          </div>
        </section>

        <footer className="border-t border-rose-100 py-8 text-center">
          <p className="text-sm text-zinc-600">Atelier Belle © 2026 · Belleza premium con esencia boutique</p>
        </footer>
      </main>

      <a href={`https://wa.me/56987654321?text=${whatsappMessage}`} target="_blank" rel="noreferrer" className="gold-soft-glow fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-xl transition hover:scale-[1.02] hover:bg-emerald-600">
        <Phone className="size-4" /> WhatsApp
      </a>

      <style jsx global>{`
        html { scroll-behavior: smooth; }
        .fade-up { animation: fadeUp 0.65s ease both; }
        .premium-hover { transition: transform 0.28s ease, box-shadow 0.28s ease; }
        .premium-hover:hover { transform: translateY(-4px); box-shadow: 0 14px 35px rgba(236, 72, 153, 0.12); }
        .gold-soft-glow { box-shadow: 0 8px 25px rgba(251, 191, 36, 0.2), 0 4px 12px rgba(251, 113, 133, 0.1); }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
