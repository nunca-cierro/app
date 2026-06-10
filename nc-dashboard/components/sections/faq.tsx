"use client";

import { useState } from "react";
import { Section } from "@/components/layout/section";
import { AnimatedWrapper } from "@/components/ui/animated-wrapper";
import { siteFaq } from "@/data/site";
import { motion, AnimatePresence } from "framer-motion";

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <Section
      id={siteFaq.sectionId}
      className="bg-[#F3EDE0] text-stone-900"
      containerClassName="max-w-4xl px-3 sm:px-4 lg:px-6"
    >
      <AnimatedWrapper direction="up" duration={0.6}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-amber-600">
            {siteFaq.label}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-stone-800 md:text-4xl">
            {siteFaq.title}
          </h2>
          <p className="mt-4 text-stone-500">
            {siteFaq.subtitle}
          </p>
        </div>
      </AnimatedWrapper>

      {/* WhatsApp conversation style */}
      <div className="mt-14 space-y-4 max-w-2xl mx-auto relative">
        {/* Chat background pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none rounded-3xl"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        {siteFaq.items.map((faq, index) => {
          const isOpen = openIndex === index;

          return (
            <div key={index} className="relative">
              {/* Question bubble — outgoing (right-aligned) */}
              <motion.button
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="w-full text-left"
                whileTap={{ scale: 0.98 }}
              >
                <div
                  className="inline-block max-w-[85%] rounded-2xl rounded-br-sm px-5 py-3.5 shadow-sm ml-auto"
                  style={{
                    backgroundColor: "#DCF8C6",
                    border: "1px solid rgba(0,0,0,0.04)",
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-medium text-gray-800 flex-1 leading-relaxed pr-2">
                      {faq.question}
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-gray-400 shrink-0 mt-0.5 text-xs"
                    >
                      ▼
                    </motion.span>
                  </div>
                </div>
              </motion.button>

              {/* Answer bubble — incoming (left-aligned) */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="mt-2"
                  >
                    <div className="inline-block max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-5 py-3.5 shadow-sm border border-stone-200">
                      <p className="text-sm text-stone-600 leading-relaxed">
                        {faq.answer}
                      </p>
                      <div className="flex items-center gap-1 mt-1.5 justify-end">
                        <svg
                          className="w-3.5 h-3.5 text-[#53BDEB]"
                          viewBox="0 0 16 11"
                          fill="currentColor"
                        >
                          <path d="M11.071 0.653l-5.657 5.657-2.121-2.121-1.414 1.414 3.535 3.536 7.071-7.072z" />
                          <path d="M15.071 0.653l-5.657 5.657-1.414-1.414-1.414 1.414 2.828 2.829 7.071-7.072z" />
                        </svg>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Typing indicator at the bottom */}
        <div className="flex items-center gap-1.5 pt-2 pb-1">
          <div className="flex gap-1.5 bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
            <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    </Section>
  );
}
