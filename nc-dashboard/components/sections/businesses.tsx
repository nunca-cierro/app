"use client";

import { Section } from "@/components/layout/section";
import { AnimatedWrapper, itemVariants } from "@/components/ui/animated-wrapper";
import { motion } from "framer-motion";

interface Business {
  name: string;
  image: string;
  message: string;
  emoji: string;
}

const businesses: Business[] = [
  {
    name: "Restaurante",
    image: "/negocios/restaurante.jpg",
    message: "¿Tienen mesa para 4 hoy a las 7pm?",
    emoji: "🍽️",
  },
  {
    name: "Tienda de barrio",
    image: "/negocios/tienda-barrio.jpg",
    message: "¿Cuánto vale el arroz kilo?",
    emoji: "🛒",
  },
  {
    name: "Panadería",
    image: "/negocios/panaderia.jpg",
    message: "¿A qué hora sacan el pan caliente?",
    emoji: "🥐",
  },
  {
    name: "Hamburguesería",
    image: "/negocios/hamburgueseria.jpg",
    message: "Quiero pedir 2 hamburguesas dobles",
    emoji: "🍔",
  },
  {
    name: "Barbería",
    image: "/negocios/barberia.jpg",
    message: "¿Tienen turno para hoy a las 5pm?",
    emoji: "✂️",
  },
  {
    name: "Pastelería",
    image: "/negocios/pasteleria.jpg",
    message: "¿Cuánto vale el pastel de tres leches?",
    emoji: "🎂",
  },
];

function BusinessCard({ business }: { business: Business }) {
  return (
    <motion.div
      variants={itemVariants}
      className="group relative rounded-2xl overflow-hidden cursor-pointer"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {/* Image */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{ backgroundImage: `url('${business.image}')` }}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Business name */}
        <h3 className="absolute bottom-4 left-4 text-lg font-bold text-white z-10">
          {business.name}
        </h3>

        {/* WhatsApp bubble — always visible */}
        <div className="absolute top-3 right-3 max-w-[65%] z-10 transition-transform duration-300 group-hover:-translate-y-1">
          <div className="bg-[#DCF8C6] text-gray-800 text-xs rounded-lg rounded-tr-sm px-3 py-2 shadow-lg leading-relaxed">
            <span className="font-semibold text-[#075E54]">{business.name}</span>
            <br />
            {business.message} {business.emoji}
          </div>
          {/* Triangle tail */}
          <div className="absolute -top-1 right-0 w-0 h-0 border-l-[6px] border-l-transparent border-b-[8px] border-b-[#DCF8C6]" />
        </div>
      </div>
    </motion.div>
  );
}

export function Businesses() {
  return (
    <Section
      id="negocios"
      className="border-stone-800/80 bg-stone-950 text-stone-100"
    >
      <AnimatedWrapper direction="up" duration={0.6}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-amber-300">
            Industrias
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-stone-100 md:text-4xl">
            Funciona para tu tipo de negocio
          </h2>
          <p className="mt-4 text-stone-300/80 leading-relaxed">
            Tengas 10 o 10.000 clientes, cada consulta por WhatsApp es una venta en potencia.{" "}
            <span className="text-amber-200 font-medium">
              Automatiza la atención al cliente 24/7.
            </span>
          </p>
        </div>
      </AnimatedWrapper>

      {/* Desktop: 3×2 grid */}
      <AnimatedWrapper
        mode="stagger"
        className="hidden md:grid md:grid-cols-3 gap-5 mt-16"
      >
        {businesses.map((business) => (
          <BusinessCard key={business.name} business={business} />
        ))}
      </AnimatedWrapper>

      {/* Mobile: horizontal snap carousel */}
      <div className="md:hidden mt-10 -mx-3 overflow-x-auto pb-4 scrollbar-none">
        <div className="flex gap-4 px-3 snap-x snap-mandatory">
          {businesses.map((business) => (
            <div key={business.name} className="snap-start flex-shrink-0 w-[80vw]">
              <BusinessCard business={business} />
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
