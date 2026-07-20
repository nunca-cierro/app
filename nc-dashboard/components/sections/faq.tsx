"use client";

import { useState, useRef } from "react";
import { Search } from "lucide-react";
import { Section } from "@/components/layout/section";
import { AnimatedWrapper } from "@/components/ui/animated-wrapper";
import { siteFaq } from "@/data/site";
import { motion, AnimatePresence } from "framer-motion";

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = siteFaq.items.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Section
      id={siteFaq.sectionId}
      className="border-stone-700/60 bg-stone-800 text-stone-100"
      containerClassName="max-w-4xl px-3 sm:px-4 lg:px-6"
    >
      <AnimatedWrapper direction="up" duration={0.6}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-amber-300">
            {siteFaq.label}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-stone-100 md:text-4xl">
            {siteFaq.title}
          </h2>
          <p className="mt-4 text-stone-300/90">
            {siteFaq.subtitle}
          </p>
        </div>
      </AnimatedWrapper>

      <div className="mt-10 max-w-2xl mx-auto relative">
        {/* Chat background pattern */}
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none rounded-3xl -z-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        {/* Search input — styled as a chat input */}
        <div className="relative z-10 mb-6">
          <div className="flex items-center gap-2 bg-stone-900 rounded-full px-5 py-3 shadow-sm border border-stone-700 transition-all duration-200 focus-within:border-amber-400 focus-within:shadow-md focus-within:shadow-amber-900/20">
            <Search className="w-4 h-4 text-stone-500 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setOpenIndex(null);
              }}
              placeholder="Escribe tu duda..."
              className="flex-1 text-sm text-stone-200 placeholder:text-stone-500 bg-transparent outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-stone-500 hover:text-stone-300 text-xs font-medium"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Questions as chat bubbles */}
        <div className="relative z-10 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-stone-400 text-sm">
                No encontramos esa pregunta.{" "}
                <a
                  href="https://wa.me/573219615338"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:text-amber-300 underline underline-offset-2"
                >
                  Escríbenos por WhatsApp
                </a>
              </p>
            </div>
          ) : (
            filtered.map((faq, index) => {
              const isOpen = openIndex === index;
              const originalIndex = siteFaq.items.indexOf(faq);

              return (
                <div key={originalIndex} className="relative">
                  {/* Question bubble — outgoing (right-aligned) */}
                  <motion.button
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full text-left"
                    whileTap={{ scale: 0.98 }}
                    layout
                  >
                    <div
                      className="inline-block max-w-[88%] rounded-2xl rounded-br-sm px-5 py-3.5 shadow-sm ml-auto"
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
                        <div className="inline-block max-w-[88%] rounded-2xl rounded-bl-sm bg-stone-800 px-5 py-3.5 shadow-sm border border-stone-700">
                          <p className="text-sm text-stone-300 leading-relaxed">
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
            })
          )}
        </div>

        {/* Typing indicator */}
        <motion.div
          className="flex items-center gap-1.5 pt-4 pb-1 relative z-10"
          animate={{ opacity: filtered.length > 0 ? 1 : 0.4 }}
        >
          <div className="flex gap-1.5 bg-stone-800 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
            <span
              className="w-2 h-2 bg-stone-500 rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="w-2 h-2 bg-stone-500 rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="w-2 h-2 bg-stone-500 rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </motion.div>
      </div>
    </Section>
  );
}
