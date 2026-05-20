"use client";

import { Section } from "@/components/layout/section";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { siteHero } from "@/data/site";

export function Hero() {
  return (
    <Section
      id={siteHero.sectionId}
      className="relative min-h-screen overflow-hidden border-0 bg-stone-950 text-white scroll-mt-28 pt-36 md:pt-44 pb-24"
      containerClassName="max-w-7xl px-3 sm:px-4 lg:px-6"
    >
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[url('/tendero.png')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-[rgba(0, 0, 0, 0)]" />
      </div>

      <div className="relative z-10 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:min-h-[72vh] lg:items-end">
        <div className="max-w-xl lg:self-start">
          <h1
            className="hero-fade text-4xl md:text-6xl lg:text-7xl font-semibold leading-[1.05] text-white drop-shadow-[0_8px_26px_rgba(0,0,0,0.55)]"
            style={{ animationDelay: "0.05s" }}
          >
            {siteHero.title}
          </h1>
          <p
            className="hero-fade mt-6 text-lg md:text-xl text-white/80 leading-relaxed drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
            style={{ animationDelay: "0.15s" }}
          >
            {siteHero.subtitle}
          </p>
        </div>

        <div
          className="hero-fade w-full max-w-md lg:justify-self-end lg:self-end"
          style={{ animationDelay: "0.25s" }}
        >
          <div className="rounded-3xl border border-white/12 bg-[rgba(8,8,8,0.65)] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <h3 className="text-xl font-semibold text-white">
              Conversa con nosotros
            </h3>
            <form className="mt-6 space-y-4" noValidate>
              <div>
                <label className="sr-only" htmlFor="hero-name">
                  Nombre
                </label>
                <Input
                  id="hero-name"
                  name="name"
                  placeholder="Nombre"
                  className="bg-white/5 border-white/15 text-white placeholder:text-white/40 focus-visible:border-white/50 focus-visible:ring-white/15"
                />
              </div>
              <div>
                <label className="sr-only" htmlFor="hero-contact">
                  Email o teléfono
                </label>
                <Input
                  id="hero-contact"
                  name="contact"
                  placeholder="Email o teléfono"
                  className="bg-white/5 border-white/15 text-white placeholder:text-white/40 focus-visible:border-white/50 focus-visible:ring-white/15"
                />
              </div>
              <div>
                <label className="sr-only" htmlFor="hero-need">
                  Indícanos breve tu necesidad
                </label>
                <Textarea
                  id="hero-need"
                  name="need"
                  placeholder="Indícanos breve tu necesidad"
                  rows={4}
                  className="bg-white/5 border-white/15 text-white placeholder:text-white/40 focus-visible:border-white/50 focus-visible:ring-white/15"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-full bg-white px-6 py-3 text-sm font-semibold text-stone-950 transition-all hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(255,255,255,0.35)]"
              >
                Enviar
              </button>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        .hero-fade {
          opacity: 0;
          animation: heroFadeInUp 0.8s ease-out forwards;
        }

        @keyframes heroFadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-fade {
            opacity: 1;
            animation: none;
            transform: none;
          }
        }
      `}</style>
    </Section>
  );
}
