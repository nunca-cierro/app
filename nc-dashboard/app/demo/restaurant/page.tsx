"use client";

import Image from "next/image";
import {
  Award,
  Clock3,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Star,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

const imageLoader = ({ src }: { src: string }) => src;

const navItems = [
  { id: "home", label: "Inicio" },
  { id: "menu", label: "Menú" },
  { id: "chef", label: "Chef" },
  { id: "reservas", label: "Reservas" },
  { id: "opiniones", label: "Opiniones" },
  { id: "contacto", label: "Contacto" },
];

const menuCategorias = {
  Entradas: [
    {
      nombre: "Carpaccio de res madurada",
      desc: "Láminas finas, parmigiano de 24 meses y aceite trufado.",
      precio: "$39.000",
    },
    {
      nombre: "Burrata cremosa de Puglia",
      desc: "Tomates confitados, pesto de pistacho y pan artesanal.",
      precio: "$34.000",
    },
    {
      nombre: "Polpo alla griglia",
      desc: "Pulpo sellado, crema de papa ahumada y limón siciliano.",
      precio: "$42.000",
    },
  ],
  Pastas: [
    {
      nombre: "Tagliolini al tartufo nero",
      desc: "Pasta fresca, mantequilla avellanada y trufa de temporada.",
      precio: "$58.000",
    },
    {
      nombre: "Ravioli de ricotta y espinaca",
      desc: "Salsa pomodoro heirloom y albahaca fresca.",
      precio: "$46.000",
    },
    {
      nombre: "Pappardelle al ragù bianco",
      desc: "Cordero braseado lentamente y pecorino romano.",
      precio: "$52.000",
    },
  ],
  Carnes: [
    {
      nombre: "Filetto al Barolo",
      desc: "Corte premium con reducción de Barolo y chalotas.",
      precio: "$89.000",
    },
    {
      nombre: "Costillas de cordero en costra",
      desc: "Hierbas mediterráneas y puré de coliflor tostada.",
      precio: "$82.000",
    },
    {
      nombre: "Branzino mediterráneo",
      desc: "A la plancha con mantequilla de alcaparras y cítricos.",
      precio: "$76.000",
    },
  ],
  Postres: [
    {
      nombre: "Tiramisú de la casa",
      desc: "Mascarpone aireado, espresso intenso y cacao belga.",
      precio: "$24.000",
    },
    {
      nombre: "Panna cotta de vainilla bourbon",
      desc: "Coulis de frutos rojos y crumble de almendra.",
      precio: "$22.000",
    },
    {
      nombre: "Cannoli siciliani",
      desc: "Crema de ricotta cítrica y pistacho tostado.",
      precio: "$21.000",
    },
  ],
};

const reconocimientos = [
  "Premio Mesa de Oro 2024",
  "Mención Guía Gastronómica Andina",
  "Embajador de cocina italiana contemporánea",
];

const opiniones = [
  {
    nombre: "Valentina M.",
    comentario:
      "Cada plato cuenta una historia. La armonía entre técnica y sabor es impecable.",
    estrellas: 5,
  },
  {
    nombre: "Andrés C.",
    comentario:
      "El servicio, la música y la cocina crean una atmósfera inolvidable para celebrar.",
    estrellas: 5,
  },
  {
    nombre: "Natalia R.",
    comentario:
      "Una experiencia fine dining real: producto excepcional y presentación impecable.",
    estrellas: 5,
  },
  {
    nombre: "Daniela P.",
    comentario:
      "La selección de vinos y maridajes elevó completamente nuestra cena aniversario.",
    estrellas: 4,
  },
  {
    nombre: "Julián F.",
    comentario:
      "Cocina sofisticada sin perder calidez. Volveremos con clientes internacionales.",
    estrellas: 5,
  },
];

const eventos = [
  {
    titulo: "Bodas íntimas",
    desc: "Montajes elegantes, menú de autor y coordinación personalizada.",
  },
  {
    titulo: "Aniversarios",
    desc: "Experiencias románticas con maridaje y detalles a medida.",
  },
  {
    titulo: "Cenas corporativas",
    desc: "Espacios privados con servicio premium para ejecutivos y equipos.",
  },
];

const galeria = [
  "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1100&q=80",
  "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?auto=format&fit=crop&w=900&q=80",
];

function scrollToSectionWithOffset(id: string) {
  const section = document.getElementById(id);
  if (!section) return;
  const offset = 132;
  const top = section.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: "smooth" });
}

export default function RestaurantDemo() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoriaActiva, setCategoriaActiva] =
    useState<keyof typeof menuCategorias>("Entradas");
  const [reservaRecibida, setReservaRecibida] = useState(false);
  const [sliderIndex, setSliderIndex] = useState(0);

  function goTo(id: string) {
    setMenuOpen(false);
    scrollToSectionWithOffset(id);
  }

  function onSubmitReserva(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setReservaRecibida(true);
    setTimeout(() => setReservaRecibida(false), 4500);
  }

  const opinionesVisibles = useMemo(() => {
    return [
      opiniones[sliderIndex % opiniones.length],
      opiniones[(sliderIndex + 1) % opiniones.length],
      opiniones[(sliderIndex + 2) % opiniones.length],
    ];
  }, [sliderIndex]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0b0a09] text-[#f7f1e8]">
      <div className="pointer-events-none fixed inset-0 z-0 luxury-pattern" />

      <div className="fixed top-0 z-40 w-full border-b border-[#b48a47]/25 bg-[#130e0d]/95 text-[#dec8a0] backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-4 py-2 text-xs sm:justify-between sm:text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#c89d58]" />
            Bogotá · Zona Gourmet
          </div>
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-[#c89d58]" />
            Lun-Dom · 12:00pm - 11:30pm
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-[#c89d58]" />
            +57 314 248 2943
          </div>
        </div>
      </div>

      <header className="fixed top-9.5 z-40 w-full border-b border-[#b48a47]/30 bg-[#100b0bcc]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4">
          <button
            onClick={() => goTo("home")}
            className="text-left transition-opacity hover:opacity-90"
          >
            <div className="font-serif text-2xl tracking-[0.16em] text-[#e3be80]">
              La Toscana
            </div>
            <div className="mt-1 inline-block rounded-full border border-[#b48a47]/50 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[#efd9b2]">
              Fine Dining
            </div>
          </button>

          <nav className="hidden items-center gap-7 md:flex">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => goTo(item.id)}
                className="text-sm tracking-wide text-[#f3e4ca] transition-colors hover:text-[#d8a95d]"
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => goTo("reservas")}
              className="premium-cta rounded-full px-5 py-2.5 text-sm font-semibold text-[#1b120e]"
            >
              Reservar Mesa
            </button>
          </nav>

          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Abrir menú"
            className="rounded-xl border border-[#b48a47]/30 p-2 text-[#e6c690] transition md:hidden"
          >
            {menuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {menuOpen && (
          <nav className="slide-down md:hidden w-full border-t border-[#b48a47]/25 bg-[#120d0ddd] px-4 py-5 backdrop-blur-2xl">
            <div className="mx-auto flex max-w-7xl flex-col gap-3">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => goTo(item.id)}
                  className="rounded-xl border border-[#b48a47]/20 bg-[#231616]/60 px-4 py-3 text-left text-[#f4e6cd] transition hover:border-[#b48a47]/45"
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => goTo("reservas")}
                className="premium-cta mt-2 rounded-xl px-4 py-3 text-sm font-semibold text-[#1d130f]"
              >
                Reservar Mesa
              </button>
            </div>
          </nav>
        )}
      </header>

      <main className="relative z-10 pt-37.5">
        <section id="home" className="mx-auto max-w-7xl px-4 py-14 md:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="fade-rise">
              <p className="mb-4 text-xs uppercase tracking-[0.24em] text-[#caa56a]">
                Alta cocina italiana contemporánea
              </p>
              <h1 className="font-serif text-4xl leading-tight text-[#f8efe0] sm:text-5xl lg:text-6xl">
                La Toscana — Experiencia Italiana de Alta Cocina
              </h1>
              <p className="mt-6 max-w-xl text-base text-[#e4d1b2] sm:text-lg">
                Una velada creada para emocionar: ingredientes excepcionales,
                técnica refinada y una atmósfera íntima donde cada detalle eleva
                la experiencia.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => goTo("menu")}
                  className="premium-cta rounded-full px-7 py-3.5 font-semibold text-[#1f140f]"
                >
                  Explorar Menú
                </button>
                <button
                  onClick={() => goTo("reservas")}
                  className="rounded-full border border-[#b48a47]/60 bg-[#2c171a] px-7 py-3.5 font-semibold text-[#f1dcb9] transition hover:border-[#ddb77a] hover:bg-[#3b1d22]"
                >
                  Reservar Mesa
                </button>
              </div>

              <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  { title: "15+ años", sub: "de tradición" },
                  { title: "Chef galardonado", sub: "cocina de autor" },
                  {
                    title: "Ingredientes importados",
                    sub: "selección premium",
                  },
                ].map((stat) => (
                  <div
                    key={stat.title}
                    className="rounded-2xl border border-[#b48a47]/30 bg-[#1a1112]/75 px-4 py-4"
                  >
                    <div className="font-serif text-lg text-[#ebcf9f]">
                      {stat.title}
                    </div>
                    <div className="text-xs uppercase tracking-wide text-[#ccb184]">
                      {stat.sub}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="fade-rise-delay relative">
              <div className="absolute -inset-5 rounded-[2rem] bg-[radial-gradient(circle_at_20%_20%,rgba(202,158,93,0.22),transparent_60%)]" />
              <Image
                loader={imageLoader}
                unoptimized
                src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1400&q=80"
                alt="Plato gourmet italiano"
                width={1400}
                height={1200}
                className="relative h-135 w-full rounded-[2rem] object-cover shadow-[0_30px_70px_rgba(0,0,0,0.6)]"
              />
            </div>
          </div>
        </section>

        <section id="menu" className="mx-auto max-w-7xl px-4 py-20">
          <div className="mb-10 fade-rise text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-[#c7a063]">
              Carta de autor
            </p>
            <h2 className="mt-3 font-serif text-4xl text-[#f7ecd9]">Menú</h2>
          </div>

          <div className="mx-auto max-w-5xl rounded-[2rem] border border-[#b48a47]/30 bg-[#120d0e]/90 p-5 sm:p-8">
            <div className="mb-8 flex flex-wrap justify-center gap-2">
              {(
                Object.keys(menuCategorias) as Array<
                  keyof typeof menuCategorias
                >
              ).map((categoria) => (
                <button
                  key={categoria}
                  onClick={() => setCategoriaActiva(categoria)}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                    categoriaActiva === categoria
                      ? "bg-[#c89d58] text-[#1f120e]"
                      : "bg-[#28181a] text-[#e5cfaa] hover:bg-[#352023]"
                  }`}
                >
                  {categoria}
                </button>
              ))}
            </div>

            <ul className="space-y-5">
              {menuCategorias[categoriaActiva].map((item) => (
                <li key={item.nombre} className="fade-rise">
                  <div className="mb-1 flex items-end gap-4">
                    <h3 className="font-serif text-xl text-[#f5ddbb]">
                      {item.nombre}
                    </h3>
                    <span className="mb-1 h-px flex-1 border-t border-dashed border-[#b48a47]/35" />
                    <span className="text-lg font-semibold text-[#d9b06f]">
                      {item.precio}
                    </span>
                  </div>
                  <p className="text-sm text-[#d6c09c]">{item.desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-6">
          <div className="grid gap-6 md:grid-cols-3">
            {eventos.map((evento, index) => (
              <article
                key={evento.titulo}
                className="fade-rise rounded-3xl border border-[#b48a47]/25 bg-[#170f10] p-6"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <p className="mb-2 text-xs uppercase tracking-[0.18em] text-[#ba9052]">
                  Eventos privados
                </p>
                <h3 className="font-serif text-2xl text-[#f5e4c7]">
                  {evento.titulo}
                </h3>
                <p className="mt-3 text-[#d9c3a2]">{evento.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="chef"
          className="mx-auto grid max-w-7xl gap-10 px-4 py-20 lg:grid-cols-2"
        >
          <div className="fade-rise rounded-[2rem] border border-[#b48a47]/30 bg-[#130d0f] p-3">
            <Image
              loader={imageLoader}
              unoptimized
              src="https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=1200&q=80"
              alt="Chef principal de La Toscana"
              width={1200}
              height={1100}
              className="h-130 w-full rounded-[1.5rem] object-cover"
            />
          </div>
          <div className="fade-rise-delay flex flex-col justify-center">
            <p className="text-xs uppercase tracking-[0.22em] text-[#caa56a]">
              Nuestro chef
            </p>
            <h2 className="mt-3 font-serif text-4xl text-[#f6ecd8]">
              Alessandro Vitale
            </h2>
            <p className="mt-5 leading-relaxed text-[#dcc6a4]">
              Formado entre Florencia y Milán, Alessandro fusiona tradición
              italiana y técnica contemporánea. Su cocina destaca por sabores
              limpios, producto de origen y presentaciones elegantes que elevan
              cada servicio a una experiencia memorable.
            </p>

            <ul className="mt-7 space-y-4">
              {reconocimientos.map((reconocimiento) => (
                <li
                  key={reconocimiento}
                  className="flex items-center gap-3 rounded-xl border border-[#b48a47]/20 bg-[#1b1113] p-4"
                >
                  <Award className="h-5 w-5 text-[#d6aa67]" />
                  <span className="text-[#ecd9bc]">{reconocimiento}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="reservas" className="mx-auto max-w-5xl px-4 py-20">
          <div className="fade-rise rounded-[2rem] border border-[#b48a47]/35 bg-[#120c0d] p-6 sm:p-10">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.22em] text-[#c9a46a]">
                Atención personalizada
              </p>
              <h2 className="mt-2 font-serif text-4xl text-[#f6ebd8]">
                Reservas
              </h2>
            </div>

            <form
              onSubmit={onSubmitReserva}
              className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2"
            >
              <input required placeholder="Nombre" className="form-luxury" />
              <input required placeholder="Teléfono" className="form-luxury" />
              <input required type="date" className="form-luxury" />
              <input required type="time" className="form-luxury" />
              <input
                required
                type="number"
                min="1"
                max="20"
                placeholder="Personas"
                className="form-luxury"
              />
              <select required className="form-luxury">
                <option value="">Ocasión especial</option>
                <option>Cumpleaños</option>
                <option>Aniversario</option>
                <option>Pedida de mano</option>
                <option>Celebración empresarial</option>
              </select>
              <textarea
                placeholder="Mensaje"
                rows={4}
                className="form-luxury md:col-span-2"
              />
              <button
                type="submit"
                className="premium-cta md:col-span-2 rounded-xl px-6 py-4 text-lg font-semibold text-[#24170f]"
              >
                Confirmar Reserva
              </button>
            </form>

            {reservaRecibida && (
              <div className="fade-soft mt-5 rounded-xl border border-[#d8b578]/40 bg-[#2f1d20] px-4 py-3 text-center text-[#f3ddba]">
                Reserva recibida, confirmaremos por WhatsApp.
              </div>
            )}
          </div>
        </section>

        <section id="opiniones" className="mx-auto max-w-7xl px-4 py-20">
          <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#c9a46a]">
                Voces de nuestros invitados
              </p>
              <h2 className="mt-2 font-serif text-4xl text-[#f7ecd9]">
                Opiniones
              </h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setSliderIndex(
                    (prev) => (prev - 1 + opiniones.length) % opiniones.length,
                  )
                }
                className="rounded-full border border-[#b48a47]/40 px-4 py-2 text-sm text-[#ebd1a8] transition hover:bg-[#2a1a1d]"
              >
                Anterior
              </button>
              <button
                onClick={() =>
                  setSliderIndex((prev) => (prev + 1) % opiniones.length)
                }
                className="rounded-full border border-[#b48a47]/40 px-4 py-2 text-sm text-[#ebd1a8] transition hover:bg-[#2a1a1d]"
              >
                Siguiente
              </button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {opinionesVisibles.map((opinion) => (
              <article
                key={`${opinion.nombre}-${opinion.comentario}`}
                className="fade-soft rounded-3xl border border-[#b48a47]/25 bg-[#160f10] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#d7b074]/60"
              >
                <div className="mb-3 flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      className={`h-4 w-4 ${
                        index < opinion.estrellas
                          ? "fill-[#d3a963] text-[#d3a963]"
                          : "text-[#5f4a35]"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[#e2ccab]">“{opinion.comentario}”</p>
                <p className="mt-5 font-serif text-lg text-[#f2ddbd]">
                  {opinion.nombre}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20">
          <div className="mb-8 text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-[#ca9f62]">
              Ambiente & detalles
            </p>
            <h2 className="mt-2 font-serif text-4xl text-[#f8edd9]">Galería</h2>
          </div>

          <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
            {galeria.map((img, index) => (
              <Image
                loader={imageLoader}
                unoptimized
                key={img}
                src={img}
                alt={`Galería La Toscana ${index + 1}`}
                width={1000}
                height={1200}
                className="fade-soft mb-5 h-auto w-full break-inside-avoid rounded-2xl object-cover"
              />
            ))}
          </div>
        </section>

        <section id="contacto" className="mx-auto max-w-7xl px-4 pb-20 pt-8">
          <div className="grid gap-8 rounded-[2rem] border border-[#b48a47]/30 bg-[#120c0d] p-6 sm:p-10 lg:grid-cols-2">
            <div className="fade-rise">
              <p className="text-xs uppercase tracking-[0.22em] text-[#ca9f62]">
                Conversemos
              </p>
              <h2 className="mt-2 font-serif text-4xl text-[#f8edd8]">
                Contacto
              </h2>

              <div className="mt-6 space-y-4 text-[#e5d2b3]">
                <p>
                  <span className="font-semibold text-[#eecf9f]">
                    Dirección:
                  </span>{" "}
                  Cra. 15 #85-50, Bogotá, Colombia
                </p>
                <p>
                  <span className="font-semibold text-[#eecf9f]">Horario:</span>{" "}
                  Lunes a Domingo, 12:00pm - 11:30pm
                </p>
                <p>
                  <span className="font-semibold text-[#eecf9f]">
                    Teléfono:
                  </span>{" "}
                  +57 314 248 2943
                </p>
                <p>
                  <span className="font-semibold text-[#eecf9f]">Correo:</span>{" "}
                  reservas@latoscana.co
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="https://wa.me/573142482943?text=Hola,%20vi%20la%20demo%20de%20tu%20restaurante%20y%20me%20gustaría%20cotizar%20un%20sitio%20web.%20¿Que%20información%20necesitas?"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="premium-cta rounded-full px-6 py-3 font-semibold text-[#21150f]"
                >
                  WhatsApp
                </a>
                <a
                  href="https://maps.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-[#b48a47]/55 bg-[#2d181b] px-6 py-3 font-semibold text-[#f2ddbb] transition hover:bg-[#3b1d22]"
                >
                  Ver en Google Maps
                </a>
              </div>
            </div>

            <div className="fade-rise-delay rounded-2xl border border-[#b48a47]/25 bg-[#181112] p-3">
              <div
                className="h-full min-h-80 rounded-xl bg-cover bg-center"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=80')",
                }}
                aria-label="Mapa de ubicación"
              />
            </div>
          </div>
        </section>
      </main>

      <a
        href="https://wa.me/573142482943?text=Hola,%20quiero%20reservar%20en%20La%20Toscana"
        target="_blank"
        rel="noopener noreferrer"
        className="gold-glow fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#d2a25e] text-[#1a120e] shadow-xl transition hover:scale-105"
        aria-label="WhatsApp"
      >
        <MessageCircle className="h-7 w-7" />
      </a>

      <footer className="relative z-10 border-t border-[#b48a47]/20 bg-[#0d0908] px-4 py-10 text-center text-[#d2bb96]">
        <div className="mb-3 flex flex-wrap items-center justify-center gap-5 text-sm">
          <button onClick={() => goTo("home")} className="hover:text-[#e5c28a]">
            Inicio
          </button>
          <button onClick={() => goTo("menu")} className="hover:text-[#e5c28a]">
            Menú
          </button>
          <button
            onClick={() => goTo("reservas")}
            className="hover:text-[#e5c28a]"
          >
            Reservas
          </button>
          <button
            onClick={() => goTo("contacto")}
            className="hover:text-[#e5c28a]"
          >
            Contacto
          </button>
        </div>
        <p className="text-xs tracking-wide text-[#bfa883]">
          © {new Date().getFullYear()} La Toscana Fine Dining. Todos los
          derechos reservados.
        </p>
      </footer>

      <style jsx global>{`
        .luxury-pattern {
          background:
            radial-gradient(
              circle at 15% 15%,
              rgba(160, 112, 58, 0.2),
              transparent 35%
            ),
            radial-gradient(
              circle at 85% 20%,
              rgba(131, 35, 50, 0.18),
              transparent 32%
            ),
            radial-gradient(
              circle at 50% 80%,
              rgba(96, 23, 31, 0.25),
              transparent 40%
            ),
            linear-gradient(135deg, #0b0a09 0%, #140d0e 35%, #0f0a09 100%);
        }

        .premium-cta {
          background: linear-gradient(
            135deg,
            #f0cd93 0%,
            #c9964b 45%,
            #e8be78 100%
          );
          box-shadow:
            inset 0 1px 0 rgba(255, 240, 212, 0.65),
            0 10px 25px rgba(170, 113, 44, 0.35);
          transition: all 0.25s ease;
        }

        .premium-cta:hover {
          transform: translateY(-1px);
          filter: saturate(1.05);
          box-shadow:
            inset 0 1px 0 rgba(255, 240, 212, 0.75),
            0 14px 30px rgba(188, 129, 52, 0.4);
        }

        .gold-glow {
          box-shadow:
            0 0 0 0 rgba(211, 159, 90, 0.5),
            0 14px 26px rgba(0, 0, 0, 0.45);
          animation: pulseGold 2.4s ease-in-out infinite;
        }

        .form-luxury {
          border: 1px solid rgba(195, 151, 89, 0.3);
          background: rgba(35, 22, 24, 0.82);
          border-radius: 0.75rem;
          padding: 0.85rem 0.95rem;
          color: #f5e8d2;
          outline: none;
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .form-luxury::placeholder {
          color: rgba(210, 180, 138, 0.65);
        }

        .form-luxury:focus {
          border-color: rgba(222, 180, 112, 0.7);
          box-shadow: 0 0 0 3px rgba(194, 143, 73, 0.24);
        }

        .fade-rise {
          animation: riseIn 0.75s cubic-bezier(0.2, 0.8, 0.25, 1) both;
        }

        .fade-rise-delay {
          animation: riseIn 0.95s cubic-bezier(0.2, 0.8, 0.25, 1) both;
        }

        .fade-soft {
          animation: fadeSoft 0.8s ease both;
        }

        .slide-down {
          animation: slideDown 0.32s ease both;
        }

        @keyframes riseIn {
          from {
            opacity: 0;
            transform: translateY(22px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeSoft {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulseGold {
          0% {
            box-shadow:
              0 0 0 0 rgba(211, 159, 90, 0.45),
              0 14px 26px rgba(0, 0, 0, 0.45);
          }
          70% {
            box-shadow:
              0 0 0 14px rgba(211, 159, 90, 0),
              0 14px 26px rgba(0, 0, 0, 0.45);
          }
          100% {
            box-shadow:
              0 0 0 0 rgba(211, 159, 90, 0),
              0 14px 26px rgba(0, 0, 0, 0.45);
          }
        }
      `}</style>
    </div>
  );
}
