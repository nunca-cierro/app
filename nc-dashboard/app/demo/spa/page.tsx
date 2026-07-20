"use client";

import Image from "next/image";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const imageLoader = ({ src }: { src: string }) => src;

const HEADER_OFFSET = 88;

const navItems = [
  { id: "home", label: "Inicio" },
  { id: "services", label: "Servicios" },
  { id: "ritual", label: "Ritual Premium" },
  { id: "packages", label: "Planes" },
  { id: "testimonials", label: "Testimonios" },
  { id: "contact", label: "Contacto" },
];

const services = [
  {
    icon: "🌿",
    name: "Masaje relajante",
    desc: "Técnicas suaves para liberar tensión.",
  },
  {
    icon: "🕯️",
    name: "Aromaterapia",
    desc: "Esencias naturales para equilibrio emocional.",
  },
  {
    icon: "💆",
    name: "Facial hidratante",
    desc: "Limpieza profunda con activos botánicos.",
  },
  {
    icon: "🔥",
    name: "Sauna terapéutico",
    desc: "Calor controlado para desintoxicar y renovar.",
  },
  {
    icon: "🧖",
    name: "Exfoliación corporal",
    desc: "Renovación de piel con sales minerales.",
  },
  {
    icon: "🦶",
    name: "Reflexología podal",
    desc: "Estimulación de puntos para bienestar integral.",
  },
  {
    icon: "🧴",
    name: "Envoltura nutritiva",
    desc: "Hidratación intensiva con mantecas naturales.",
  },
  {
    icon: "✨",
    name: "Ritual express",
    desc: "Experiencia corta para recargar energía.",
  },
];

const ritualSteps = [
  "Bienvenida con té herbal",
  "Aromaterapia guiada",
  "Masaje relajante",
  "Sauna + ducha fría",
  "Facial premium",
];

const packages = [
  {
    name: "Essential",
    price: "$129.000",
    benefits: [
      "1 tratamiento a elección",
      "Duración de 70 minutos",
      "Bebida herbal de cortesía",
    ],
  },
  {
    name: "Premium",
    price: "$189.000",
    benefits: [
      "2 tratamientos combinados",
      "Duración de 120 minutos",
      "Acceso privado a sauna",
      "Aromaterapia personalizada",
    ],
    featured: true,
  },
  {
    name: "VIP",
    price: "$259.000",
    benefits: [
      "Circuito completo de bienestar",
      "Duración de 180 minutos",
      "Facial premium incluido",
      "Bebida premium y detalle especial",
    ],
  },
];

const testimonials = [
  {
    name: "Carolina R.",
    stars: 5,
    comment:
      "Desde la recepción todo se siente cuidado. Salí completamente renovada.",
  },
  {
    name: "Mateo A.",
    stars: 5,
    comment:
      "Ambiente impecable, terapeutas expertos y una experiencia realmente boutique.",
  },
  {
    name: "Valentina M.",
    stars: 4,
    comment:
      "Mi plan favorito para desconectarme. El ritual premium vale totalmente la pena.",
  },
  {
    name: "Daniela C.",
    stars: 5,
    comment:
      "Me encantó la mezcla de aromas, música suave y atención personalizada.",
  },
];

const benefits = [
  { value: "95%", label: "clientes satisfechos" },
  { value: "10+", label: "terapeutas certificados" },
  { value: "7", label: "días a la semana" },
  { value: "6 años", label: "de experiencia boutique" },
];

const galleryImages = [
  "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=900&q=80",
];

function smoothScrollWithOffset(id: string) {
  const section = document.getElementById(id);
  if (!section) return;

  const top =
    section.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
  window.scrollTo({ top, behavior: "smooth" });
}

export default function SpaDemo() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [formSent, setFormSent] = useState(false);

  const handleNav = (id: string) => {
    setMenuOpen(false);
    smoothScrollWithOffset(id);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormSent(true);
    setTimeout(() => setFormSent(false), 3500);
  };

  return (
    <div className="min-h-screen bg-[#f8f6f1] text-[#2d3b35]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#d8d2c3]/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-22 w-full max-w-7xl items-center justify-between px-4 md:px-8">
          <button
            onClick={() => handleNav("home")}
            className="text-2xl font-semibold tracking-wide text-[#4f6f61]"
          >
            Serenity Spa
          </button>

          <nav className="hidden items-center gap-6 lg:flex">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className="text-sm font-medium text-[#5a6f65] transition hover:text-[#7d8f65]"
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => handleNav("contact")}
              className="rounded-full border border-[#d9caa3] bg-[#f2ede2] px-5 py-2.5 text-sm font-semibold text-[#5a6f65] transition hover:-translate-y-0.5 hover:bg-[#ece3d0]"
            >
              Agendar Cita
            </button>
          </nav>

          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="rounded-full border border-[#d8d2c3] p-2 text-[#5a6f65] lg:hidden"
            aria-label="Abrir menú"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-40 bg-[#2f3f38]/20 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMenuOpen(false)}
      />

      <aside
        className={`fixed right-0 top-0 z-50 h-full w-[82%] max-w-sm border-l border-[#e2dccd] bg-[#fffdfa] p-6 shadow-xl transition-transform duration-300 lg:hidden ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-10 flex items-center justify-between">
          <span className="text-xl font-semibold text-[#4f6f61]">
            Serenity Spa
          </span>
          <button
            onClick={() => setMenuOpen(false)}
            className="rounded-full border border-[#d8d2c3] p-2 text-[#5a6f65]"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex flex-col gap-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className="w-full rounded-xl border border-[#ece6d9] px-4 py-3 text-left font-medium text-[#5a6f65] transition hover:bg-[#f4efe4]"
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => handleNav("contact")}
            className="mt-4 w-full rounded-xl bg-[#7f9889] px-4 py-3 font-semibold text-white transition hover:bg-[#6f8678]"
          >
            Agendar Cita
          </button>
        </nav>
      </aside>

      <main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-32 md:px-8">
        <section
          id="home"
          className="grid items-center gap-10 py-12 lg:grid-cols-2 lg:py-16"
        >
          <div className="fade-up space-y-7">
            <span className="inline-flex rounded-full border border-[#ddd3be] bg-[#f5f1e7] px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#8a7b58]">
              Wellness Boutique
            </span>
            <h1 className="text-4xl font-semibold leading-tight text-[#3f5a4f] md:text-5xl">
              Serenity Spa — Tu refugio de calma
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-[#60756a] md:text-lg">
              Crea una pausa consciente en tu semana con rituales diseñados para
              relajar cuerpo, mente y emociones en un entorno sereno.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleNav("services")}
                className="rounded-full bg-[#6f8a7b] px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#5f7a6b]"
              >
                Ver Servicios
              </button>
              <button
                onClick={() => handleNav("contact")}
                className="rounded-full border border-[#d9caa3] bg-[#f5f0e5] px-6 py-3 text-sm font-semibold text-[#5f7468] transition hover:-translate-y-0.5 hover:bg-[#eee3cd]"
              >
                Agendar Cita
              </button>
            </div>
            <div className="grid gap-2 rounded-2xl border border-[#e7e0cf] bg-white p-5 text-sm text-[#60756a] shadow-sm md:grid-cols-3">
              <p>
                <span className="font-semibold text-[#4f6f61]">Horario:</span>
                <br />
                Lun a Dom · 9:00 a.m. - 9:00 p.m.
              </p>
              <p>
                <span className="font-semibold text-[#4f6f61]">Dirección:</span>
                <br />
                Av. 19 #120-45, Bogotá
              </p>
              <p>
                <span className="font-semibold text-[#4f6f61]">Teléfono:</span>
                <br />
                +57 300 111 2233
              </p>
            </div>
          </div>

          <div className="fade-up-delayed relative mx-auto w-full max-w-md">
            <Image
              loader={imageLoader}
              unoptimized
              src="https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&w=1000&q=80"
              alt="Espacio relajante de spa"
              width={1000}
              height={1400}
              className="h-140 w-full rounded-[2rem] object-cover shadow-[0_20px_60px_-30px_rgba(84,112,98,0.45)]"
            />
            <div className="absolute -bottom-5 -left-4 rounded-2xl border border-[#dfd6c2] bg-[#f8f2e8]/90 px-4 py-3 text-sm text-[#6a7e73] shadow-lg">
              Ambiente cálido, aromas naturales y atención personalizada.
            </div>
          </div>
        </section>

        <section className="py-10">
          <div className="grid gap-4 rounded-3xl border border-[#e9e1cf] bg-[#fdfbf7] p-6 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl bg-white p-5 text-center shadow-sm"
              >
                <p className="text-3xl font-semibold text-[#4f6f61]">
                  {item.value}
                </p>
                <p className="mt-1 text-sm text-[#6a7e73]">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="services" className="py-14">
          <h2 className="text-center text-3xl font-semibold text-[#3f5a4f]">
            Servicios
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[#6a7e73]">
            Tratamientos diseñados para equilibrar cuerpo y mente con un enfoque
            personalizado.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <article
                key={service.name}
                className="group rounded-2xl border border-[#ece4d4] bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <span className="text-2xl">{service.icon}</span>
                <h3 className="mt-4 text-lg font-semibold text-[#4f6f61]">
                  {service.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6a7e73]">
                  {service.desc}
                </p>
                <span className="mt-4 inline-block text-xs font-semibold uppercase tracking-[0.16em] text-[#8a7b58]">
                  Bienestar integral
                </span>
              </article>
            ))}
          </div>
        </section>

        <section
          id="ritual"
          className="grid gap-8 py-14 lg:grid-cols-[1.1fr_1fr]"
        >
          <div>
            <h2 className="text-3xl font-semibold text-[#3f5a4f]">
              Ritual Premium
            </h2>
            <p className="mt-3 max-w-xl text-[#6a7e73]">
              Una experiencia secuencial para desconectar, renovar energía y
              recuperar tu equilibrio interno.
            </p>

            <div className="mt-8 space-y-5 border-l-2 border-[#d7cdb5] pl-6">
              {ritualSteps.map((step, index) => (
                <div
                  key={step}
                  className="relative rounded-2xl border border-[#ece4d4] bg-white p-4 shadow-sm"
                >
                  <span className="absolute -left-8.5 top-5 grid h-5 w-5 place-content-center rounded-full border border-[#d7cdb5] bg-[#f4ecdc] text-[10px] font-bold text-[#7f6f4c]">
                    {index + 1}
                  </span>
                  <p className="font-medium text-[#4f6f61]">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <Image
              loader={imageLoader}
              unoptimized
              src="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80"
              alt="Ritual de spa premium"
              width={1200}
              height={1200}
              className="h-full min-h-105 w-full rounded-[2rem] object-cover shadow-[0_20px_60px_-30px_rgba(84,112,98,0.45)]"
            />
          </div>
        </section>

        <section className="py-14">
          <h2 className="text-center text-3xl font-semibold text-[#3f5a4f]">
            Galería
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[#6a7e73]">
            Espacios y momentos que reflejan nuestra esencia de calma y
            elegancia.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {galleryImages.map((image, index) => (
              <div
                key={image}
                className="group overflow-hidden rounded-2xl border border-[#eadfcb] bg-white"
              >
                <Image
                  loader={imageLoader}
                  unoptimized
                  src={image}
                  alt={`Galería Serenity Spa ${index + 1}`}
                  width={900}
                  height={700}
                  className="h-52 w-full object-cover transition duration-500 group-hover:scale-110"
                />
              </div>
            ))}
          </div>
        </section>

        <section id="packages" className="py-14">
          <h2 className="text-center text-3xl font-semibold text-[#3f5a4f]">
            Planes
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[#6a7e73]">
            Elige el plan ideal para regalarte una pausa con estilo y bienestar.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {packages.map((pack) => (
              <article
                key={pack.name}
                className={`rounded-3xl border bg-white p-7 shadow-sm transition hover:-translate-y-1 ${
                  pack.featured
                    ? "border-[#d9caa3] shadow-[0_24px_50px_-30px_rgba(140,120,80,0.4)]"
                    : "border-[#ece4d4]"
                }`}
              >
                {pack.featured && (
                  <span className="mb-4 inline-flex rounded-full bg-[#f3ebda] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#856f45]">
                    Más elegido
                  </span>
                )}
                <h3 className="text-2xl font-semibold text-[#4f6f61]">
                  {pack.name}
                </h3>
                <p className="mt-2 text-3xl font-semibold text-[#3f5a4f]">
                  {pack.price}
                </p>
                <ul className="mt-5 space-y-3 text-sm text-[#63776d]">
                  {pack.benefits.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-[#7f9889]">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleNav("contact")}
                  className={`mt-7 w-full rounded-full px-5 py-3 text-sm font-semibold transition ${
                    pack.featured
                      ? "bg-[#6f8a7b] text-white hover:bg-[#607a6c]"
                      : "border border-[#d8cfba] bg-[#f8f3e8] text-[#5f7468] hover:bg-[#efe5d1]"
                  }`}
                >
                  Elegir plan
                </button>
              </article>
            ))}
          </div>
        </section>

        <section id="testimonials" className="py-14">
          <h2 className="text-center text-3xl font-semibold text-[#3f5a4f]">
            Testimonios
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[#6a7e73]">
            Historias reales de clientes que convirtieron su autocuidado en
            hábito.
          </p>
          <div className="mt-8 flex gap-4 overflow-x-auto pb-4">
            {testimonials.map((item) => (
              <article
                key={item.name}
                className="min-w-72.5 max-w-sm rounded-2xl border border-[#ece4d4] bg-white p-6 shadow-sm"
              >
                <div className="mb-2 text-[#d2b677]">
                  {"★".repeat(item.stars)}
                  {"☆".repeat(5 - item.stars)}
                </div>
                <p className="text-sm leading-relaxed text-[#60756a]">
                  “{item.comment}”
                </p>
                <p className="mt-4 font-semibold text-[#4f6f61]">{item.name}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="contact" className="py-14">
          <h2 className="text-center text-3xl font-semibold text-[#3f5a4f]">
            Contacto
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[#6a7e73]">
            Agenda tu sesión y permite que diseñemos una experiencia a tu
            medida.
          </p>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.25fr_0.95fr]">
            <form
              onSubmit={handleSubmit}
              className="rounded-3xl border border-[#e9e0cd] bg-white p-6 shadow-sm md:p-8"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  required
                  placeholder="Nombre"
                  className="rounded-xl border border-[#e5decb] bg-[#fcfaf6] px-4 py-3 text-sm outline-none transition focus:border-[#9aae9f]"
                />
                <input
                  required
                  placeholder="Teléfono"
                  className="rounded-xl border border-[#e5decb] bg-[#fcfaf6] px-4 py-3 text-sm outline-none transition focus:border-[#9aae9f]"
                />
                <input
                  type="email"
                  required
                  placeholder="Correo"
                  className="rounded-xl border border-[#e5decb] bg-[#fcfaf6] px-4 py-3 text-sm outline-none transition focus:border-[#9aae9f]"
                />
                <select
                  required
                  className="rounded-xl border border-[#e5decb] bg-[#fcfaf6] px-4 py-3 text-sm outline-none transition focus:border-[#9aae9f]"
                >
                  <option value="">Servicio</option>
                  {services.map((service) => (
                    <option key={service.name} value={service.name}>
                      {service.name}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  required
                  className="rounded-xl border border-[#e5decb] bg-[#fcfaf6] px-4 py-3 text-sm outline-none transition focus:border-[#9aae9f]"
                />
                <input
                  placeholder="Mensaje breve"
                  required
                  className="rounded-xl border border-[#e5decb] bg-[#fcfaf6] px-4 py-3 text-sm outline-none transition focus:border-[#9aae9f]"
                />
              </div>
              <button
                type="submit"
                className="mt-5 rounded-full bg-[#6f8a7b] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#5f7a6b]"
              >
                Enviar
              </button>
              {formSent && (
                <p className="mt-4 text-sm font-medium text-[#5c7669]">
                  Solicitud enviada. Te contactaremos muy pronto.
                </p>
              )}
            </form>

            <div className="rounded-3xl border border-[#e9e0cd] bg-[#fdfaf3] p-6 shadow-sm md:p-8">
              <h3 className="text-2xl font-semibold text-[#4f6f61]">
                Visítanos
              </h3>
              <p className="mt-4 text-sm text-[#60756a]">
                Dirección: Av. 19 #120-45, Bogotá, Colombia
              </p>
              <p className="mt-2 text-sm text-[#60756a]">
                Horario: Lunes a Domingo · 9:00 a.m. - 9:00 p.m.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="https://wa.me/573001112233"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-[#6f8a7b] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5f7a6b]"
                >
                  WhatsApp
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-[#d8cfba] bg-white px-5 py-2.5 text-sm font-semibold text-[#5f7468] transition hover:bg-[#f2ebdc]"
                >
                  Instagram
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="py-8">
          <div className="rounded-3xl border border-[#decfa9] bg-[#f6efdf] px-6 py-8 text-center shadow-sm md:px-8">
            <p className="text-xl font-semibold text-[#4f6f61] md:text-2xl">
              Reserva hoy y recibe aromaterapia gratis
            </p>
            <button
              onClick={() => handleNav("contact")}
              className="mt-4 rounded-full bg-[#6f8a7b] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#5f7a6b]"
            >
              Quiero mi reserva
            </button>
          </div>
        </section>
      </main>

      <a
        href="https://wa.me/573001112233"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 right-5 z-50 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-1"
      >
        WhatsApp
      </a>

      <footer className="border-t border-[#e5decd] bg-[#fdfbf7] py-8 text-center text-sm text-[#6a7e73]">
        © {new Date().getFullYear()} Serenity Spa. Todos los derechos
        reservados.
      </footer>

      <style jsx>{`
        .fade-up {
          animation: fadeUp 0.7s ease-out;
        }

        .fade-up-delayed {
          animation: fadeUp 0.9s ease-out;
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
      `}</style>
    </div>
  );
}
