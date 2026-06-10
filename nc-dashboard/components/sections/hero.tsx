"use client";

import { Section } from "@/components/layout/section";
import { siteHero } from "@/data/site";
import { WhatsAppMockup } from "./hero/whatsapp-mockup";
import { QRCard } from "./hero/qr-card";
import { SocialProof } from "./hero/social-proof";
import { HeroBackground } from "./hero/hero-background";

export function Hero() {
  return (
    <Section
      id={siteHero.sectionId}
      className="relative min-h-screen overflow-hidden border-0 bg-stone-950 text-white scroll-mt-28 pt-36 md:pt-44 pb-24"
      containerClassName="max-w-7xl px-3 sm:px-4 lg:px-6"
    >
      <HeroBackground />

      <div className="relative z-10 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:min-h-[72vh] lg:items-end">
        {/* Left: Title, subtitle, QR and social proof */}
        <div className="max-w-xl lg:self-start space-y-6">
          <h1
            className="hero-fade text-4xl md:text-6xl lg:text-7xl font-semibold leading-[1.05] text-white drop-shadow-[0_8px_26px_rgba(0,0,0,0.55)]"
            style={{ animationDelay: "0.05s" }}
          >
            {siteHero.title}
          </h1>
          <p
            className="hero-fade text-lg md:text-xl text-white/80 leading-relaxed drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
            style={{ animationDelay: "0.15s" }}
          >
            {siteHero.subtitle}
          </p>

          {/* QR Card */}
          <div
            className="hero-fade"
            style={{ animationDelay: "0.2s" }}
          >
            <QRCard />
          </div>

          {/* Social Proof */}
          <div
            className="hero-fade"
            style={{ animationDelay: "0.25s" }}
          >
            <SocialProof />
          </div>
        </div>

        {/* Right: WhatsApp mockup */}
        <div
          className="hero-fade w-full max-w-md lg:justify-self-end lg:self-center"
          style={{ animationDelay: "0.3s" }}
        >
          <WhatsAppMockup />
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
