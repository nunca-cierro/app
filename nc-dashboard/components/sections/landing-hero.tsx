"use client";

import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { ResponsiveDeviceMorph } from "@/components/ui/devices";
import { HeroBackground } from "@/components/sections/hero/hero-background";
import { landingHero } from "@/data/landing/hero";

import { ArrowRight } from "lucide-react";
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
    >
      <HeroBackground />

      <div className="relative z-10 grid gap-12 lg:grid-cols-[1.15fr_0.85fr] items-start">
        <div className="max-w-3xl md:mt-5">
          <div>
            <h1 className="hero-fade-in text-4xl md:text-5xl lg:text-6xl font-semibold text-white leading-tight tracking-tight text-balance">
              {landingHero.title}
            </h1>
            <p
              className="hero-fade-in mt-6 text-lg md:text-xl text-white/70 leading-relaxed max-w-2xl"
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
                className="border-white/40 text-white hover:bg-white/10 hover:text-white"
              >
                <a href={landingHero.cta.secondary.href}>
                  {landingHero.cta.secondary.label}
                </a>
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {landingHero.disclaimer.map((item, idx) => (
                <span
                  key={idx}
                  className="hero-fade-chip text-xs md:text-sm text-amber-300 bg-white/10 rounded-full px-3 py-1 border border-white/20 shadow-sm font-medium"
                  style={{ animationDelay: `${0.2 + idx * 0.08}s` }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-5 lg:pt-16">
          <ResponsiveDeviceMorph
            containerClassName="w-full sm:max-w-sm lg:max-w-130"
            height={480}
          />
        </div>
      </div>

      {/* Stats or Trust Indicators */}
      <div className="mt-20 pt-10 border-t border-white/20">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {landingHero.stats.map((stat, idx) => {
            const IconComponent = statIcons[stat.icon];
            return (
              <div
                key={idx}
                className="group bg-white border border-stone-200 rounded-xl p-5 flex flex-col items-center text-center shadow-md transition-all duration-200 hover:scale-105 hover:border-amber-400/70 hover:bg-amber-50 cursor-pointer"
              >
                <span className="text-3xl md:text-4xl mb-2 text-stone-600 transition-colors group-hover:text-amber-600">
                  {IconComponent}
                </span>
                <p className="font-semibold text-base md:text-lg text-stone-700 group-hover:text-amber-700">
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

        @media (prefers-reduced-motion: reduce) {
          .hero-fade-in,
          .hero-fade-chip {
            opacity: 1;
            animation: none;
            transform: none;
          }
        }
      `}</style>
    </Section>
  );
}
