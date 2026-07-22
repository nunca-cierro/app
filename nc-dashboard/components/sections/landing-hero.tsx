"use client";

import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { ResponsiveDeviceMorph } from "@/components/ui/devices";
import { HeroBackground } from "@/components/sections/hero/hero-background";
import { landingHero } from "@/data/landing/hero";

import { ArrowRight, Check } from "lucide-react";
import {
  MdWhatsapp,
  MdFlashOn,
  MdAttachMoney,
  MdLocationOn,
} from "react-icons/md";

const statIcons: Record<string, React.ReactNode> = {
  MessageCircle: <MdWhatsapp />,
  Zap: <MdFlashOn />,
  DollarSign: <MdAttachMoney />,
  MapPin: <MdLocationOn />,
};

export function LandingHero() {
  return (
    <Section
      id={landingHero.sectionId}
      className="relative min-h-screen overflow-hidden border-0 text-white scroll-mt-28 pt-36 md:pt-44 pb-24"
      containerClassName="max-w-7xl px-3 sm:px-4 lg:px-6"
    >
      <HeroBackground images="websites" />

      <div className="relative z-10 grid gap-12 lg:grid-cols-[1.15fr_0.85fr] items-start mt-8 md:mt-10">
        <div className="max-w-2xl lg:self-start space-y-6 mt-5">
          <div>
            <h1 className="hero-fade-in text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.05] text-white/95 landing-neon-glow">
              {landingHero.title}
            </h1>
            <p
              className="hero-fade-in mt-6 text-lg md:text-xl text-white/90 leading-relaxed drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
              style={{ animationDelay: "0.1s" }}
            >
              {landingHero.subtitle}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button
                asChild
                size="lg"
                className="group bg-amber-500 text-stone-950 hover:bg-amber-400"
              >
                <a href={landingHero.cta.primary.href}>
                  {landingHero.cta.primary.label}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/30 bg-black/20 text-white/90 hover:bg-black/35 hover:text-white hover:border-white/50 backdrop-blur-xs"
              >
                <a href={landingHero.cta.secondary.href}>
                  {landingHero.cta.secondary.label}
                </a>
              </Button>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              {landingHero.disclaimer.map((item, idx) => {
                const label = item.replace(/^[✔✓]\s*/, "");
                return (
                  <span
                    key={idx}
                    className="hero-fade-chip inline-flex items-center gap-2 text-sm text-amber-200 bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-amber-400/20 shadow-lg shadow-amber-900/10 font-medium"
                    style={{ animationDelay: `${0.2 + idx * 0.08}s` }}
                  >
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-400/20 text-amber-400 shrink-0">
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </span>
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:self-center translate-y-2.5">
          <ResponsiveDeviceMorph
            containerClassName="w-full sm:max-w-sm lg:max-w-130"
            height={480}
          />
        </div>
      </div>

      {/* Stats or Trust Indicators */}
      <div className="relative z-20 mt-20 pt-10 border-t border-white/20">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {landingHero.stats.map((stat, idx) => {
            const IconComponent = statIcons[stat.icon];
            return (
              <div
                key={idx}
                className="group bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-5 flex flex-col items-center text-center shadow-md transition-all duration-200 hover:scale-105 hover:border-amber-400/50 hover:bg-white/20 cursor-pointer"
              >
                <span className="text-3xl md:text-4xl mb-2 text-white/80 transition-colors group-hover:text-amber-400">
                  {IconComponent}
                </span>
                <p className="font-semibold text-base md:text-lg text-white/90 group-hover:text-amber-300">
                  {stat.title}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .hero-fade-in {
          opacity: 0;
          animation: heroFadeInUp 0.7s ease-out forwards;
        }

        .hero-fade-chip {
          opacity: 0;
          animation: heroFadeInSoft 0.55s ease-out forwards;
        }

        .landing-neon-glow {
          filter: drop-shadow(0 0 10px rgba(251,191,36,0.10)) drop-shadow(0 0 24px rgba(251,191,36,0.04));
          animation: heroFadeInUp 0.7s ease-out forwards, neonPulse 3s ease-in-out 0.7s infinite;
        }

        @keyframes heroFadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes heroFadeInSoft {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes neonPulse {
          0%, 100% {
            filter: drop-shadow(0 0 10px rgba(251,191,36,0.10)) drop-shadow(0 0 24px rgba(251,191,36,0.04));
          }
          50% {
            filter: drop-shadow(0 0 14px rgba(251,191,36,0.18)) drop-shadow(0 0 36px rgba(251,191,36,0.08));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-fade-in,
          .hero-fade-chip {
            opacity: 1;
            animation: none;
            transform: none;
          }
          .landing-neon-glow {
            filter: drop-shadow(0 0 10px rgba(251,191,36,0.10));
            animation: none;
          }
        }
      `}</style>
    </Section>
  );
}
