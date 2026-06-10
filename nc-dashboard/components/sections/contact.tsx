"use client";

import { siteContact } from "@/data/site";
import { Section } from "@/components/layout/section";
import { AnimatedWrapper } from "@/components/ui/animated-wrapper";
import { Mail, MessageCircle, Clock, ArrowRight } from "lucide-react";

const WHATSAPP_URL =
  "https://wa.me/573219615338?text=Hola%2C+quiero+automatizar+mi+negocio+con+NuncaCierro";

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

      {/* Grid: contact cards + call to action */}
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
                <p className="text-xs text-amber-600/70">
                  Sin robots, sin demoras
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

        {/* Right — Visual + Checklist */}
        <AnimatedWrapper direction="up" duration={0.5} delay={0.2}>
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-stone-200">
            {/* Decorative neon-style number */}
            <div className="text-center mb-6">
              <span
                className="text-[5rem] md:text-[6rem] font-[100] leading-none select-none"
                style={{ color: "#E8D5B0" }}
              >
                &quot;?
              </span>
              <h3 className="text-xl font-semibold text-stone-800 -mt-4 relative">
                {siteContact.quoteChecklist.title}
              </h3>
            </div>

            <ul className="space-y-4">
              {siteContact.quoteChecklist.items.map((item) => (
                <li
                  key={item.text}
                  className="flex items-start gap-3 text-stone-600"
                >
                  <span className="text-amber-500 text-lg shrink-0 mt-0.5">
                    {item.icon === "FaRegBuilding" && "🏪"}
                    {item.icon === "FaMapMarkerAlt" && "📍"}
                    {item.icon === "FaRegStar" && "⭐"}
                    {item.icon === "FaRegCalendarCheck" && "📅"}
                  </span>
                  <span className="text-sm leading-relaxed">{item.text}</span>
                </li>
              ))}
            </ul>

            {/* Decorative line */}
            <div className="mt-6 pt-4 border-t border-stone-100 text-center">
              <p className="text-xs text-stone-400">
                Sin compromiso. Te orientamos en 2 minutos.
              </p>
            </div>
          </div>
        </AnimatedWrapper>
      </div>
    </Section>
  );
}
