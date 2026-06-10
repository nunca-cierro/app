"use client";

import { siteContact } from "@/data/site";
import { Section } from "@/components/layout/section";
import { AnimatedWrapper } from "@/components/ui/animated-wrapper";
import { Mail, MessageCircle, Clock, ArrowRight } from "lucide-react";

const WHATSAPP_URL =
  "https://wa.me/573219615338?text=Hola%2C+quiero+automatizar+mi+negocio+con+NuncaCierro";

function ContactChatMockup() {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm border border-stone-200 overflow-hidden">
      {/* Chat header */}
      <div className="bg-[#075E54] -mx-4 -mt-4 px-4 py-2.5 mb-4 flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-amber-200 flex items-center justify-center text-xs font-bold text-amber-800">
          NC
        </div>
        <div>
          <p className="text-white text-sm font-medium leading-tight">
            NuncaCierro
          </p>
          <p className="text-white/70 text-[10px] leading-tight">en línea</p>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-3">
        {/* User message */}
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-4 py-2.5 shadow-sm border border-stone-100">
            <p className="text-[13px] text-gray-700 leading-relaxed">
              Hola, quiero automatizar mi negocio
            </p>
            <span className="text-[9px] text-gray-400 mt-0.5 block text-right">
              10:32 AM
            </span>
          </div>
        </div>

        {/* Bot response */}
        <div className="flex justify-end">
          <div
            className="max-w-[90%] rounded-2xl rounded-br-sm px-4 py-2.5 shadow-sm"
            style={{ backgroundColor: "#DCF8C6" }}
          >
            <p className="text-[13px] text-gray-700 leading-relaxed">
              ¡Hola! 👋 Cuéntame para ayudarte mejor:
            </p>
            <div className="mt-1.5 space-y-1">
              {[
                "🏪 ¿A qué se dedica tu negocio?",
                "📍 ¿En qué ciudad estás?",
                "⭐ ¿Qué preguntas recibes siempre?",
                "📅 ¿Agenda, catálogo o seguimiento?",
              ].map((item) => (
                <p
                  key={item}
                  className="text-[13px] text-gray-700 leading-relaxed pl-2 border-l-2 border-amber-400/50"
                >
                  {item}
                </p>
              ))}
            </div>
            <div className="flex items-center gap-1 mt-1.5 justify-end">
              <svg
                className="w-3 h-3 text-[#53BDEB]"
                viewBox="0 0 16 11"
                fill="currentColor"
              >
                <path d="M11.071 0.653l-5.657 5.657-2.121-2.121-1.414 1.414 3.535 3.536 7.071-7.072z" />
                <path d="M15.071 0.653l-5.657 5.657-1.414-1.414-1.414 1.414 2.828 2.829 7.071-7.072z" />
              </svg>
              <span className="text-[9px] text-gray-400">10:32 AM</span>
            </div>
          </div>
        </div>

        {/* Typing indicator */}
        <div className="flex justify-start">
          <div className="flex gap-1 bg-white rounded-2xl rounded-bl-sm px-3 py-2.5 shadow-sm">
            <span
              className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div className="mt-3 -mx-4 -mb-4 px-4 py-2.5 bg-stone-50 border-t border-stone-100 flex items-center gap-2">
        <div className="flex-1 bg-white rounded-full px-4 py-2 border border-stone-200">
          <span className="text-xs text-stone-400">Escribe un mensaje...</span>
        </div>
        <div className="w-7 h-7 rounded-full bg-[#075E54] flex items-center justify-center">
          <svg
            className="w-3.5 h-3.5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function Contact() {
  return (
    <Section
      id={siteContact.sectionId}
      className="bg-[#F3EDE0] text-stone-900"
    >
      <AnimatedWrapper direction="up" duration={0.6}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-amber-600">
            {siteContact.label}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-stone-800 md:text-4xl">
            {siteContact.title}
          </h2>
          <p className="mt-4 text-stone-500 leading-relaxed">
            {siteContact.subtitle}
          </p>
        </div>
      </AnimatedWrapper>

      {/* Grid: contact cards + chat mockup */}
      <div className="mt-14 grid gap-8 md:grid-cols-2 md:items-start max-w-4xl mx-auto">
        {/* Left — Contact cards */}
        <AnimatedWrapper direction="up" duration={0.5} delay={0.1}>
          <div className="space-y-5">
            {/* WhatsApp card */}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm border border-stone-200 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-stone-500">WhatsApp</p>
                  <p className="text-base font-semibold text-stone-800">
                    +57 321 961 5338
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-stone-300 group-hover:text-amber-500 transition-colors shrink-0" />
              </div>
            </a>

            {/* Email card */}
            <a
              href="mailto:soporte@nuncacierro.com"
              className="group block"
            >
              <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm border border-stone-200 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-amber-50 text-amber-600 shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-stone-500">Correo</p>
                  <p className="text-base font-semibold text-stone-800">
                    soporte@nuncacierro.com
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-stone-300 group-hover:text-amber-500 transition-colors shrink-0" />
              </div>
            </a>

            {/* Response time badge */}
            <div className="flex items-center gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-amber-100 text-amber-600 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {siteContact.quickResponseText}
                </p>
              </div>
            </div>

            {/* CTA button */}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-amber-600 hover:-translate-y-0.5 hover:shadow-lg w-full justify-center"
            >
              <MessageCircle className="w-5 h-5" />
              {siteContact.confidenceText}
            </a>
          </div>
        </AnimatedWrapper>

        {/* Right — WhatsApp mockup showing the conversation */}
        <AnimatedWrapper direction="up" duration={0.5} delay={0.2}>
          <ContactChatMockup />
        </AnimatedWrapper>
      </div>
    </Section>
  );
}
