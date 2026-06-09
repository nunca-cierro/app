"use client";

import Link from "next/link";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { siteBanner, sitePlans } from "@/data/site";
import {
  AnimatedWrapper,
  itemVariants,
} from "@/components/ui/animated-wrapper";
import { motion } from "framer-motion";

function getWhatsAppUrl(text: string) {
  return `https://wa.me/${siteBanner.whatsappNumber}?text=${encodeURIComponent(text)}`;
}

function getPlanWhatsAppUrl(planName: string) {
  return `${sitePlans.whatsappBaseUrl}${encodeURIComponent(`Quiero el plan ${planName} para mi negocio.`)}`;
}

export function Plans() {
  return (
    <Section
      id={sitePlans.sectionId}
      className="border-stone-800/80 bg-stone-950 text-stone-100"
    >
      <AnimatedWrapper direction="up" duration={0.6}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-amber-300">
            {sitePlans.label}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-stone-100 md:text-4xl">
            {sitePlans.title}
          </h2>
          <p className="mt-4 text-stone-300/90">{sitePlans.subtitle}</p>
        </div>
      </AnimatedWrapper>

      <AnimatedWrapper
        mode="stagger"
        className="mt-14 grid gap-7 md:grid-cols-3"
      >
        {sitePlans.packages.map((plan) => (
          <motion.div key={plan.name} variants={itemVariants}>
            <Card
              className={`group relative flex h-full flex-col rounded-lg border p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_0_1px_rgba(251,191,36,0.35),0_12px_30px_rgba(251,191,36,0.18)] ${
                plan.featured
                  ? "border-amber-400/60 bg-stone-900/80 shadow-[0_0_0_1px_rgba(251,191,36,0.35),0_20px_40px_rgba(251,191,36,0.2)] scale-[1.02]"
                  : "border-stone-800/80 bg-stone-900/60"
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-100 backdrop-blur whitespace-nowrap">
                  {sitePlans.cardLabels.featuredBadge}
                </div>
              )}

              <div className="flex-1">
                {/* Plan type label */}
                <span className="inline-block rounded-md border border-stone-700/60 bg-stone-800/70 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300/90">
                  {plan.type}
                </span>

                <h3 className="mt-3 text-xl font-semibold text-stone-100">
                  {plan.name}
                </h3>

                <p className="mt-3 text-sm text-stone-300/90">
                  {plan.description}
                </p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                      <span className="text-sm text-stone-300/90">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-7">
                <Button
                  asChild
                  variant={plan.featured ? "default" : "outline"}
                  className="w-full"
                >
                  <Link href={getPlanWhatsAppUrl(plan.name)}>
                    {sitePlans.buttonText}
                  </Link>
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatedWrapper>

      <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-stone-400">
        {sitePlans.footerText}
      </p>

      <div className="mt-8 rounded-lg border border-amber-400/35 bg-amber-400/10 px-5 py-4 text-center shadow-[0_0_0_1px_rgba(34,211,238,0.16)]">
        <p className="text-sm font-medium text-amber-100">
          {sitePlans.guaranteeText}
        </p>
      </div>

      <div className="mt-12 rounded-lg border border-amber-400/35 bg-stone-900/80 p-7 text-center shadow-[0_0_0_1px_rgba(34,211,238,0.2),0_18px_40px_rgba(34,211,238,0.12)]">
        <p className="text-lg font-semibold text-stone-100">
          {sitePlans.advisoryCta.title}
        </p>
        <p className="mt-2 text-sm text-stone-300/85">
          {sitePlans.advisoryCta.description}
        </p>
        <div className="mt-5">
          <Button asChild className="px-7">
            <Link href={getWhatsAppUrl(sitePlans.advisoryCta.whatsappText)}>
              {sitePlans.advisoryCta.buttonText}
            </Link>
          </Button>
        </div>
      </div>
    </Section>
  );
}
