"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const conversations = [
  {
    question: "¿Tienen menú?",
    answer: "Sí 🙌 Te lo enviamos a WhatsApp",
  },
  {
    question: "¿A qué hora cierran?",
    answer: "8 PM ⏰ Te esperamos",
  },
  {
    question: "¿Hacen domicilios?",
    answer: "Sí 🚚 En 30 min te llega",
  },
  {
    question: "¿Tienen en talla M?",
    answer: "Sí 📦 Te confirmamos el stock",
  },
  {
    question: "¿Qué precio tiene?",
    answer: "$35.000 🤝 Te damos más info",
  },
  {
    question: "¿Tienen cita hoy?",
    answer: "Sí, a las 4 PM 🕓 Te agendamos",
  },
];

type ChatPhase = "question" | "typing" | "answer" | "pause";

export function BotPanel() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<ChatPhase>("question");
  const [clientCount, setClientCount] = useState(3);
  const [dots, setDots] = useState("");

  // Rotating dots for typing indicator
  useEffect(() => {
    if (phase !== "typing") return;
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, [phase]);

  // Chat conversation cycle
  useEffect(() => {
    const t0 = setTimeout(() => setPhase("question"), 0);
    const t1 = setTimeout(() => setPhase("typing"), 1800);
    const t2 = setTimeout(() => setPhase("answer"), 2800);
    const t3 = setTimeout(() => {
      setPhase("pause");
      setIndex((i) => (i + 1) % conversations.length);
    }, 4800);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [index]);

  // Live counter: random fluctuation between 2-7
  useEffect(() => {
    const interval = setInterval(
      () => {
        setClientCount(Math.floor(Math.random() * 6) + 2);
      },
      4000 + Math.random() * 3000,
    );
    return () => clearInterval(interval);
  }, []);

  const current = conversations[index];
  const prev =
    conversations[(index - 1 + conversations.length) % conversations.length];
  // Show previous question during pause for smooth transition
  const displayQuestion = phase === "pause" ? prev.question : current.question;

  return (
    <div className="w-full max-w-65 mx-auto lg:max-w-70">
      {/* Phone frame */}
      <div className="relative rounded-[2.5rem] border-[3px] border-stone-700/70 bg-stone-900/90 p-2.5 shadow-[0_0_40px_rgba(251,191,36,0.10)]">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-7 bg-stone-950 rounded-b-2xl z-10 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-stone-700" />
          <span className="w-10 h-1.5 rounded-full bg-stone-800" />
        </div>

        {/* Screen */}
        <div
          className="rounded-[1.4rem] overflow-hidden bg-stone-950 pt-7 flex flex-col"
          style={{ minHeight: "520px" }}
        >
          <div className="p-3.5 flex flex-col flex-1">
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-stone-800/60">
              {/* Bot Avatar */}
              <div className="relative shrink-0">
                <BotSVG />
                <motion.span
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-purple-500 ring-2 ring-stone-950"
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-stone-100">
                  NuncaCierro
                </p>
                <p className="text-xs text-stone-400 flex items-center gap-1.5">
                  <motion.span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  Siempre activo
                </p>
              </div>
              {/* Live counter */}
              <div className="text-right">
                <motion.p
                  key={clientCount}
                  initial={{ y: -8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-lg font-bold text-amber-400 tabular-nums"
                >
                  {clientCount}
                </motion.p>
                <p className="text-[10px] text-stone-500 leading-tight">
                  clientes
                  <br />
                  ahora
                </p>
              </div>
            </div>

            {/* Chat window */}
            <div className="flex-1 flex flex-col justify-end gap-2.5 min-h-75">
              <AnimatePresence mode="popLayout">
                {/* Customer question */}
                <motion.div
                  key={`q-${index}-${phase}`}
                  initial={{ opacity: 0, x: -20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 10, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="self-start max-w-[85%] rounded-xl rounded-bl-sm bg-stone-800/80 px-3.5 py-2.5"
                >
                  <span className="text-[10px] font-medium text-stone-500 uppercase tracking-wider block mb-0.5">
                    Cliente
                  </span>
                  <p className="text-sm text-stone-200">{displayQuestion}</p>
                </motion.div>

                {/* Typing indicator */}
                {(phase === "typing" || phase === "pause") && (
                  <motion.div
                    key={`typing-${index}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="self-start max-w-[60%] rounded-xl rounded-bl-sm bg-amber-500/15 px-3.5 py-2.5"
                  >
                    <span className="text-[10px] font-medium text-amber-400/70 uppercase tracking-wider block mb-0.5">
                      NuncaCierro
                    </span>
                    <p className="text-sm text-amber-200/80">
                      {phase === "typing" ? `escribe${dots}` : "✓ Listo"}
                    </p>
                  </motion.div>
                )}

                {/* Bot answer */}
                {phase === "answer" && (
                  <motion.div
                    key={`a-${index}`}
                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -10, scale: 0.95 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="self-end max-w-[85%] rounded-xl rounded-br-sm bg-linear-to-br from-amber-600/30 to-orange-600/20 px-3.5 py-2.5 border border-amber-400/15"
                  >
                    <span className="text-[10px] font-medium text-amber-400 uppercase tracking-wider block mb-0.5">
                      NuncaCierro
                    </span>
                    <p className="text-sm text-amber-100">{current.answer}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="mt-3 pt-3 border-t border-stone-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
                <span className="text-[11px] text-stone-500">
                  Tiempo real · {conversations.length} conversaciones
                </span>
              </div>
              <motion.span
                className="text-[11px] text-amber-400/60"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ● En vivo
              </motion.span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BotSVG() {
  return (
    <motion.svg
      viewBox="0 0 64 80"
      className="w-11 h-14"
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Antenna */}
      <line
        x1="32"
        y1="6"
        x2="32"
        y2="1"
        stroke="#f59e0b"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <motion.circle
        cx="32"
        cy="1"
        r="2"
        fill="#f59e0b"
        animate={{ opacity: [1, 0.2, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />

      {/* Head */}
      <rect
        x="16"
        y="8"
        width="32"
        height="26"
        rx="6"
        className="fill-stone-700/80 stroke-amber-400/25"
        strokeWidth="1"
      />

      {/* Eyes */}
      <motion.ellipse
        cx="24"
        cy="20"
        rx="3.5"
        ry="3"
        fill="#f59e0b"
        animate={{ scaleY: [1, 0.1, 1] }}
        transition={{ duration: 4, repeat: Infinity, times: [0, 0.05, 0.1] }}
        style={{ originX: "24px", originY: "20px" }}
      />
      <motion.ellipse
        cx="40"
        cy="20"
        rx="3.5"
        ry="3"
        fill="#f59e0b"
        animate={{ scaleY: [1, 0.1, 1] }}
        transition={{
          duration: 4,
          repeat: Infinity,
          times: [0, 0.05, 0.1],
          delay: 0.1,
        }}
        style={{ originX: "40px", originY: "20px" }}
      />

      {/* Eye glow */}
      <ellipse cx="24" cy="20" rx="6" ry="5" fill="#f59e0b" opacity="0.08" />
      <ellipse cx="40" cy="20" rx="6" ry="5" fill="#f59e0b" opacity="0.08" />

      {/* Mouth */}
      <rect
        x="26"
        y="27"
        width="12"
        height="2.5"
        rx="1.25"
        className="fill-amber-400/50"
      />

      {/* Neck */}
      <rect
        x="28"
        y="34"
        width="8"
        height="3"
        className="fill-stone-700/60"
        rx="1"
      />

      {/* Body */}
      <rect
        x="22"
        y="37"
        width="20"
        height="18"
        rx="4"
        className="fill-stone-700/60 stroke-amber-400/15"
        strokeWidth="1"
      />

      {/* Body LED */}
      <motion.circle
        cx="32"
        cy="44"
        r="2"
        fill="#f59e0b"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Arms */}
      <motion.line
        x1="16"
        y1="40"
        x2="9"
        y2="45"
        className="stroke-stone-600"
        strokeWidth="1.5"
        strokeLinecap="round"
        animate={{ rotate: [0, 10, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ originX: "16px", originY: "40px" }}
      />
      <motion.line
        x1="48"
        y1="40"
        x2="55"
        y2="45"
        className="stroke-stone-600"
        strokeWidth="1.5"
        strokeLinecap="round"
        animate={{ rotate: [0, -10, 0] }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.3,
        }}
        style={{ originX: "48px", originY: "40px" }}
      />
    </motion.svg>
  );
}
