"use client";

import Link from "next/link";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { siteBanner, sitePlans } from "@/data/site";
import { AnimatedWrapper } from "@/components/ui/animated-wrapper";
import { Check } from "lucide-react";

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

      {/* ── Comparison table ── */}
      <div className="mt-14 max-w-5xl mx-auto">
        <AnimatedWrapper direction="up" duration={0.5}>
          <div className="overflow-x-auto rounded-xl border border-stone-800/80 bg-stone-900/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-800/80">
                  <th className="text-left px-5 py-5 text-stone-400 font-medium">
                    Característica
                  </th>
                  <th className="px-5 py-5 text-center align-bottom">
                    <div className="inline-flex flex-col items-center gap-1.5">
                      <span className="text-stone-300 font-semibold text-base">
                        Básico
                      </span>
                    </div>
                  </th>
                  <th className="px-5 py-5 text-center align-bottom relative">
                    <div className="inline-flex flex-col items-center gap-1.5">
                      <span className="inline-block rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-100 whitespace-nowrap">
                        {sitePlans.cardLabels.featuredBadge}
                      </span>
                      <span className="text-amber-300 font-semibold text-base">
                        Profesional
                      </span>
                    </div>
                  </th>
                  <th className="px-5 py-5 text-center align-bottom">
                    <div className="inline-flex flex-col items-center gap-1.5">
                      <span className="text-stone-300 font-semibold text-base">
                        Empresarial
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sitePlans.comparisonRows.map((row, i) => (
                  <tr
                    key={row.label}
                    className={i % 2 === 0 ? "bg-stone-900/40" : ""}
                  >
                    <td className="px-5 py-3.5 text-stone-300 font-medium">
                      {row.label}
                    </td>
                    <td className="px-5 py-3.5 text-center text-stone-400">
                      {row.basic}
                    </td>
                    <td className="px-5 py-3.5 text-center text-stone-100 font-medium">
                      {row.pro}
                    </td>
                    <td className="px-5 py-3.5 text-center text-stone-200">
                      {row.enterprise}
                    </td>
                  </tr>
                ))}
                {/* CTA row */}
                <tr className="border-t border-stone-800/80">
                  <td className="px-5 py-5"></td>
                  <td className="px-5 py-5 text-center">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Link href={getPlanWhatsAppUrl("Básico")}>
                        {sitePlans.buttonText}
                      </Link>
                    </Button>
                  </td>
                  <td className="px-5 py-5 text-center bg-amber-400/5">
                    <Button asChild size="sm" className="w-full">
                      <Link href={getPlanWhatsAppUrl("Profesional")}>
                        {sitePlans.buttonText}
                      </Link>
                    </Button>
                  </td>
                  <td className="px-5 py-5 text-center">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Link href={getPlanWhatsAppUrl("Empresarial")}>
                        {sitePlans.buttonText}
                      </Link>
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </AnimatedWrapper>
      </div>

      {/* ── Trial card ── */}
      <div className="mt-10 max-w-lg mx-auto">
        <AnimatedWrapper direction="up" duration={0.5}>
          <div className="rounded-xl border border-emerald-700/40 bg-emerald-900/20 px-6 py-5 text-center">
            <p className="text-sm font-semibold text-emerald-300">
              {sitePlans.trialInfo.label}
            </p>
            <p className="mt-1 text-xs text-emerald-300/70">
              {sitePlans.trialInfo.description}
            </p>
          </div>
        </AnimatedWrapper>
      </div>

      <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-stone-400">
        {sitePlans.footerText}
      </p>

      <div className="mt-6 rounded-lg border border-amber-400/35 bg-amber-400/10 px-5 py-4 text-center shadow-[0_0_0_1px_rgba(34,211,238,0.16)]">
        <p className="text-sm font-medium text-amber-100">
          {sitePlans.guaranteeText}
        </p>
      </div>

      <div className="mt-10 rounded-lg border border-amber-400/35 bg-stone-900/80 p-7 text-center shadow-[0_0_0_1px_rgba(34,211,238,0.2),0_18px_40px_rgba(34,211,238,0.12)]">
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
