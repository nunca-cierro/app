"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const slides = [
  {
    number: "01",
    title: "Nos cuentas cómo funciona tu negocio",
    description:
      "Te hacemos unas preguntas simples. Sin formularios largos ni jerga técnica.",
    visual: "chat",
  },
  {
    number: "02",
    title: "Configuramos tu WhatsApp en 48 horas",
    description:
      "Personalizamos cada respuesta con el tono de tu negocio. Tú apruebas antes de activar.",
    visual: "gear",
  },
  {
    number: "03",
    title: "Tu negocio responde solo mientras tú descansas",
    description:
      "Sin perder ventas. Sin estar pendiente del celular. Las 24 horas.",
    visual: "clock",
  },
];

function NeonSign({ type }: { type: string }) {
  const glowStyle = {
    filter:
      "drop-shadow(0 0 8px rgba(242,191,39,0.25)) drop-shadow(0 0 25px rgba(242,191,39,0.12))",
  };

  switch (type) {
    case "chat":
      return (
        <div className="relative flex items-center justify-center w-32 h-32 md:w-44 md:h-44">
          <svg
            viewBox="0 0 100 100"
            fill="none"
            className="w-full h-full text-amber-500"
            style={glowStyle}
          >
            {/* Chat bubble */}
            <path
              d="M22 32 C22 24 30 17 40 17 L60 17 C70 17 78 24 78 32 L78 58 C78 66 70 73 60 73 L50 73 L36 84 L39 73 C29 73 22 66 22 58 Z"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Three dots */}
            <circle cx="38" cy="45" r="3" fill="currentColor" />
            <circle cx="50" cy="45" r="3" fill="currentColor" />
            <circle cx="62" cy="45" r="3" fill="currentColor" />
          </svg>
        </div>
      );

    case "gear":
      return (
        <div className="relative flex items-center justify-center w-32 h-32 md:w-44 md:h-44">
          <svg
            viewBox="0 0 100 100"
            fill="none"
            className="w-full h-full text-amber-500"
            style={glowStyle}
          >
            {/* Outer ring */}
            <circle
              cx="50"
              cy="50"
              r="20"
              stroke="currentColor"
              strokeWidth="3"
            />
            {/* Inner ring */}
            <circle
              cx="50"
              cy="50"
              r="10"
              stroke="currentColor"
              strokeWidth="2.5"
            />
            {/* 8 teeth */}
            <path
              d="M50 30 L50 22"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M64 36 L70 30"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M70 50 L78 50"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M64 64 L70 70"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M50 70 L50 78"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M36 64 L30 70"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M30 50 L22 50"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M36 36 L30 30"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Center dot */}
            <circle cx="50" cy="50" r="3" fill="currentColor" opacity="0.4" />
          </svg>
        </div>
      );

    case "clock":
      return (
        <div className="relative flex items-center justify-center w-32 h-32 md:w-44 md:h-44">
          <svg
            viewBox="0 0 100 100"
            fill="none"
            className="w-full h-full text-amber-500"
            style={glowStyle}
          >
            {/* Clock face */}
            <circle
              cx="50"
              cy="50"
              r="34"
              stroke="currentColor"
              strokeWidth="3"
            />
            {/* 4 hour marks */}
            <line
              x1="50"
              y1="20"
              x2="50"
              y2="26"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <line
              x1="50"
              y1="74"
              x2="50"
              y2="80"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <line
              x1="20"
              y1="50"
              x2="26"
              y2="50"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <line
              x1="74"
              y1="50"
              x2="80"
              y2="50"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Hands at 2am */}
            <line
              x1="50"
              y1="50"
              x2="64"
              y2="36"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <line
              x1="50"
              y1="50"
              x2="50"
              y2="28"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="50" cy="50" r="3.5" fill="currentColor" />
          </svg>
        </div>
      );

    default:
      return null;
  }
}

export function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // Map scroll progress to horizontal translation (3 slides → shift 200vw)
  const scrollProgress = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const x = useTransform(scrollProgress, (v) => `-${v * 200}vw`);

  return (
    <section ref={sectionRef} className="relative h-[300vh] bg-[#F3EDE0]">
      {/* Subtle grain texture overlay */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(0,0,0,0.025) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Sticky container */}
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Horizontal track */}
        <motion.div className="flex h-full will-change-transform" style={{ x }}>
          {slides.map((slide) => (
            <div
              key={slide.number}
              className="relative flex-shrink-0 w-full h-full flex items-center justify-center px-6"
            >
              {/* Step number — large decorative background */}
              <span
                className="absolute select-none"
                style={{
                  fontSize: "clamp(5rem, 15vw, 10rem)",
                  fontWeight: 100,
                  color: "#E8D5B0",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 0,
                  lineHeight: 1,
                }}
              >
                {slide.number}
              </span>

              {/* Content */}
              <motion.div
                className="relative z-10 max-w-lg mx-auto text-center"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <NeonSign type={slide.visual} />

                <h3 className="mt-6 text-2xl md:text-3xl font-semibold text-stone-900 leading-tight">
                  {slide.title}
                </h3>

                <p className="mt-4 text-base md:text-lg text-stone-500 leading-relaxed">
                  {slide.description}
                </p>
              </motion.div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
