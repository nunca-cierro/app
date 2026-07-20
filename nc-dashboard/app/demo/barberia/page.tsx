"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import {
  Calendar,
  Instagram,
  MapPin,
  Menu,
  Phone,
  Scissors,
  X,
} from "lucide-react";

const imageLoader = ({ src }: { src: string }) => src;

const navItems = [
  { id: "home", label: "Inicio", icon: Scissors },
  { id: "services", label: "Servicios", icon: Calendar },
  { id: "styles", label: "Estilos", icon: Instagram },
  { id: "barbers", label: "Barberos", icon: Scissors },
  { id: "booking", label: "Reservas", icon: Calendar },
  { id: "contact", label: "Contacto", icon: Phone },
];

const services = [
  {
    name: "Corte Premium",
    price: "$45.000",
    detail: "Asesoría de estilo + acabado profesional.",
  },
  {
    name: "Fade Master",
    price: "$50.000",
    detail: "Transiciones limpias y definición de contornos.",
  },
  {
    name: "Barba Tradicional",
    price: "$35.000",
    detail: "Toalla caliente, navaja y bálsamo premium.",
  },
  {
    name: "Combo Corte + Barba",
    price: "$72.000",
    detail: "Servicio completo para look impecable.",
  },
  {
    name: "Tratamiento Capilar",
    price: "$40.000",
    detail: "Hidratación, masaje y revitalización.",
  },
  {
    name: "Experiencia VIP",
    price: "$95.000",
    detail: "Corte, barba, bebida y zona lounge exclusiva.",
  },
];

const styleGallery = [
  {
    name: "Skin Fade Texturizado",
    image:
      "https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Pompadour Moderno",
    image:
      "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Crop Francés",
    image:
      "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Undercut Clásico",
    image:
      "https://images.unsplash.com/photo-1622296089863-eb7fc530daa8?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Barba Perfilada",
    image:
      "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1200&q=80",
  },
];

const barbers = [
  {
    name: "Sebastián Rojas",
    specialty: "Especialista en fades y diseños modernos",
    experience: "9 años de experiencia",
    image:
      "https://images.unsplash.com/photo-1583195764036-6dc248ac07d9?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Camilo Ávila",
    specialty: "Maestro en barba clásica y navaja",
    experience: "12 años de experiencia",
    image:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Andrés Pardo",
    specialty: "Cortes ejecutivos y asesoría de imagen",
    experience: "7 años de experiencia",
    image:
      "https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=800&q=80",
  },
];

const testimonials = [
  {
    name: "Julián M.",
    text: "La mejor barbería premium en Bogotá. Cuidan cada detalle y siempre salgo con un look impecable.",
  },
  {
    name: "Daniel C.",
    text: "El servicio VIP vale cada peso. Ambiente elegante, puntualidad y excelente técnica en barba.",
  },
  {
    name: "Felipe R.",
    text: "Reservar es fácil y los barberos entienden perfecto lo que uno quiere. Muy recomendado.",
  },
  {
    name: "Santiago B.",
    text: "Probé varias opciones en la ciudad y BLACK BEARD es la más consistente en calidad y atención.",
  },
];

export default function BarberDemoPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [bookingSent, setBookingSent] = useState(false);

  const scrollToSection = (id: string) => {
    const section = document.getElementById(id);
    if (!section) return;

    const isDesktop = window.innerWidth >= 768;
    const offset = isDesktop ? 24 : 92;
    const top = section.getBoundingClientRect().top + window.scrollY - offset;

    window.scrollTo({ top, behavior: "smooth" });
    setIsMenuOpen(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBookingSent(true);
    event.currentTarget.reset();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur md:hidden">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <button
            onClick={() => scrollToSection("home")}
            className="text-left"
            aria-label="Ir a inicio"
          >
            <p className="text-sm font-semibold tracking-[0.35em] text-red-900">
              BLACK BEARD
            </p>
            <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-400">
              Barber Studio
            </p>
          </button>
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="rounded-md border border-zinc-700 p-2"
            aria-label="Abrir menú"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {isMenuOpen && (
          <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-4">
            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-800"
                  >
                    <Icon size={16} className="text-red-800" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <button
              onClick={() => scrollToSection("booking")}
              className="mt-4 w-full rounded-md bg-red-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
            >
              Reservar Turno
            </button>
          </div>
        )}
      </header>

      <aside className="fixed left-0 top-0 hidden h-screen w-[260px] flex-col border-r border-zinc-800 bg-black/90 px-6 py-8 md:flex">
        <button onClick={() => scrollToSection("home")} className="text-left">
          <p className="text-xs font-semibold tracking-[0.45em] text-red-800">
            BLACK BEARD
          </p>
          <h2 className="mt-2 text-2xl font-bold text-zinc-100">
            Barber Studio
          </h2>
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-zinc-500">
            Premium Grooming
          </p>
        </button>

        <nav className="mt-10 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
              >
                <Icon
                  size={17}
                  className="text-red-800 transition group-hover:text-red-600"
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4">
          <p className="text-xs text-zinc-500">
            Atención personalizada en barbería premium en Bogotá.
          </p>
          <button
            onClick={() => scrollToSection("booking")}
            className="w-full rounded-lg bg-red-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-800 red-glow"
          >
            Reservar Turno
          </button>
        </div>
      </aside>

      <main className="pt-16 md:pl-[260px] md:pt-0">
        <section
          id="home"
          className="relative min-h-[90vh] overflow-hidden px-4 pb-16 pt-20 md:px-10 md:pt-14 fade-in"
        >
          <Image
            loader={imageLoader}
            unoptimized
            src="https://images.unsplash.com/photo-1622288432450-277d0fef5ed6?auto=format&fit=crop&w=1600&q=80"
            alt="Interior de barbería premium"
            width={1600}
            height={1200}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/50" />

          <div className="relative z-10 mx-auto max-w-5xl">
            <p className="inline-block rounded-full border border-zinc-700 bg-black/40 px-4 py-1 text-xs uppercase tracking-[0.3em] text-red-600">
              Barbería premium en Bogotá
            </p>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight text-white md:text-6xl">
              Cortes impecables. Barba perfecta. Estilo premium.
            </h1>
            <p className="mt-5 max-w-2xl text-zinc-300 md:text-lg">
              En BLACK BEARD combinamos técnica de precisión, productos de alto
              nivel y una experiencia exclusiva para hombres que valoran su
              imagen. Nuestro equipo diseña un look personalizado para cada
              cliente.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => scrollToSection("services")}
                className="rounded-md bg-red-900 px-6 py-3 font-semibold text-white transition hover:bg-red-800 red-glow"
              >
                Ver Servicios
              </button>
              <button
                onClick={() => scrollToSection("booking")}
                className="rounded-md border border-zinc-600 bg-black/30 px-6 py-3 font-semibold text-zinc-100 transition hover:border-zinc-300"
              >
                Reservar Turno
              </button>
            </div>

            <div className="mt-10 flex flex-wrap gap-3 text-sm">
              {["Fade Expert", "Afeitado Tradicional", "VIP Lounge"].map(
                (badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-zinc-200"
                  >
                    {badge}
                  </span>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 md:px-10 fade-in">
          <div className="rounded-2xl border border-red-900/40 bg-gradient-to-r from-red-950/60 via-zinc-900 to-black p-6 red-glow">
            <p className="text-xs uppercase tracking-[0.3em] text-red-500">
              Promoción del mes
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xl font-semibold text-white md:text-2xl">
                Combo Corte + Barba + Bebida de cortesía con 20% OFF
              </p>
              <button
                onClick={() => scrollToSection("booking")}
                className="rounded-md bg-red-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
              >
                Quiero esta promo
              </button>
            </div>
          </div>
        </section>

        <section
          id="services"
          className="mx-auto max-w-6xl px-4 py-14 md:px-10 fade-in"
        >
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            Servicios y precios
          </h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            Nuestra carta de servicios está diseñada para quienes buscan una
            barbería premium en Bogotá con procesos técnicos, acabados limpios y
            atención de alto nivel.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <article
                key={service.name}
                className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 transition duration-300 hover-card"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-zinc-100">
                    {service.name}
                  </h3>
                  <span className="text-sm font-semibold text-red-500">
                    {service.price}
                  </span>
                </div>
                <p className="mt-3 text-sm text-zinc-400">{service.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="styles"
          className="mx-auto max-w-6xl px-4 py-14 md:px-10 fade-in"
        >
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            Estilos que marcan presencia
          </h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            Explora cortes modernos y acabados profesionales que trabajamos
            diariamente en nuestro estudio.
          </p>

          <div className="mt-8 flex gap-4 overflow-x-auto pb-2">
            {styleGallery.map((style) => (
              <article
                key={style.name}
                className="group min-w-[270px] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 md:min-w-[320px]"
              >
                <div className="h-72 overflow-hidden">
                  <Image
                    loader={imageLoader}
                    unoptimized
                    src={style.image}
                    alt={style.name}
                    width={900}
                    height={1200}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-zinc-100">{style.name}</h3>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          id="barbers"
          className="mx-auto max-w-6xl px-4 py-14 md:px-10 fade-in"
        >
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            Nuestro equipo de barberos
          </h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            Cada profesional domina técnicas de corte, diseño de barba y
            asesoría de imagen para elevar tu estilo personal.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {barbers.map((barber) => (
              <article
                key={barber.name}
                className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"
              >
                <Image
                  loader={imageLoader}
                  unoptimized
                  src={barber.image}
                  alt={barber.name}
                  width={900}
                  height={1100}
                  className="h-64 w-full rounded-lg object-cover"
                />
                <h3 className="mt-4 text-lg font-semibold text-white">
                  {barber.name}
                </h3>
                <p className="mt-1 text-sm text-zinc-400">{barber.specialty}</p>
                <p className="mt-1 text-sm text-red-500">{barber.experience}</p>
                <button
                  onClick={() => scrollToSection("booking")}
                  className="mt-4 w-full rounded-md border border-red-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-red-900 hover:text-white"
                >
                  Elegir este barbero
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 md:px-10 fade-in">
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            Nuestra Historia
          </h2>
          <p className="mt-4 text-zinc-300">
            BLACK BEARD nace como una barbería premium en Bogotá enfocada en
            caballeros que buscan más que un corte: una experiencia de cuidado
            personal completa. Desde nuestros inicios, combinamos la tradición
            del afeitado clásico con técnicas contemporáneas de precisión para
            ofrecer resultados consistentes y elegantes.
          </p>
          <p className="mt-3 text-zinc-400">
            Hoy somos referencia local por nuestro estándar de calidad, asesoría
            personalizada y ambiente masculino de alto nivel. Si buscas una
            barbería en Bogotá con atención profesional, estilo moderno y
            servicio exclusivo, este es tu lugar.
          </p>
        </section>

        <section
          id="booking"
          className="mx-auto max-w-6xl px-4 py-14 md:px-10 fade-in"
        >
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            Reserva tu cita
          </h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            Agenda tu servicio en menos de un minuto. Nuestro equipo confirmará
            disponibilidad y detalles por WhatsApp o llamada.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-8 grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 md:grid-cols-2"
          >
            <input
              required
              placeholder="Nombre completo"
              className="rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-red-800"
            />
            <input
              required
              placeholder="Teléfono"
              className="rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-red-800"
            />
            <input
              type="date"
              required
              className="rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-red-800"
            />
            <input
              type="time"
              required
              className="rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-red-800"
            />

            <select
              required
              className="rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-red-800"
            >
              <option value="">Selecciona servicio</option>
              {services.map((service) => (
                <option key={service.name} value={service.name}>
                  {service.name}
                </option>
              ))}
            </select>

            <select
              required
              className="rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-red-800"
            >
              <option value="">Selecciona barbero</option>
              {barbers.map((barber) => (
                <option key={barber.name} value={barber.name}>
                  {barber.name}
                </option>
              ))}
            </select>

            <textarea
              placeholder="Mensaje adicional"
              className="md:col-span-2 min-h-28 rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-red-800"
            />

            <button
              type="submit"
              className="md:col-span-2 rounded-md bg-red-900 px-6 py-3 font-semibold text-white transition hover:bg-red-800 red-glow"
            >
              Confirmar Reserva
            </button>

            {bookingSent && (
              <p className="md:col-span-2 rounded-md border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                Tu solicitud fue enviada con éxito. En breve te contactaremos
                para confirmar tu turno con atención premium.
              </p>
            )}
          </form>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 md:px-10 fade-in">
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            Opiniones de clientes
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {testimonials.map((item) => (
              <article
                key={item.name}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5"
              >
                <p className="text-zinc-300">“{item.text}”</p>
                <p className="mt-4 text-sm font-semibold text-red-500">
                  {item.name}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="contact"
          className="mx-auto max-w-6xl px-4 pb-20 pt-14 md:px-10 fade-in"
        >
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            Contacto
          </h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            Visítanos en nuestra sede de Bogotá y vive una experiencia de
            barbería premium con atención personalizada.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
              <p className="flex items-start gap-2 text-zinc-300">
                <MapPin className="mt-0.5 text-red-700" size={18} />
                Calle 93 #14-20, Zona Rosa, Bogotá
              </p>
              <p className="flex items-center gap-2 text-zinc-300">
                <Calendar className="text-red-700" size={18} />
                Lun - Sáb: 9:00 a.m. - 8:00 p.m.
              </p>
              <p className="flex items-center gap-2 text-zinc-300">
                <Phone className="text-red-700" size={18} />
                +57 320 555 1234
              </p>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-zinc-300 transition hover:text-red-500"
              >
                <Instagram size={18} />
                @blackbeard.barber
              </a>
            </div>

            <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
              <a
                href="https://wa.me/573205551234?text=Hola%2C%20quiero%20cotizar%20una%20web%20para%20mi%20barber%C3%ADa"
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center rounded-md bg-red-900 px-4 py-3 font-semibold text-white transition hover:bg-red-800"
              >
                WhatsApp: Cotizar mi web
              </a>
              <a
                href="https://maps.google.com/?q=Calle+93+14-20+Bogota"
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center rounded-md border border-zinc-700 px-4 py-3 font-semibold text-zinc-200 transition hover:border-zinc-500"
              >
                Ver en Google Maps
              </a>
            </div>
          </div>
        </section>
      </main>

      <a
        href="https://wa.me/573205551234?text=Hola%2C%20quiero%20reservar%20un%20turno%20en%20BLACK%20BEARD"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-50 rounded-full bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-105 hover:bg-green-500"
      >
        WhatsApp
      </a>

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        .fade-in {
          animation: fadeUp 0.7s ease-out both;
        }

        .red-glow {
          box-shadow: 0 0 30px rgba(127, 29, 29, 0.35);
        }

        .hover-card {
          transform: translateY(0);
        }

        .hover-card:hover {
          transform: translateY(-6px);
          border-color: rgba(153, 27, 27, 0.8);
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(12px);
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
