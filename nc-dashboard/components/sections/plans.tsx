"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { siteBanner, sitePlans } from "@/data/site";
import { AnimatedWrapper } from "@/components/ui/animated-wrapper";

function getWhatsAppUrl(text: string) {
  return `https://wa.me/${siteBanner.whatsappNumber}?text=${encodeURIComponent(text)}`;
}

function getPlanWhatsAppUrl(planName: string) {
  return `${sitePlans.whatsappBaseUrl}${encodeURIComponent(`Quiero el plan ${planName} para mi negocio.`)}`;
}

function CellValue({ value }: { value: string }) {
  if (value === "✅") {
    return <Check className="inline-block w-4 h-4 text-emerald-500" />;
  }
  return <>{value}</>;
}

export function Plans() {
  return (
    <Section
      id={sitePlans.sectionId}
      className="bg-[#F3EDE0] text-stone-900"
    >
      <AnimatedWrapper direction="up" duration={0.6}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-amber-600">
            {sitePlans.label}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-stone-800 md:text-4xl">
            {sitePlans.title}
          </h2>
          <p className="mt-4 text-stone-500">{sitePlans.subtitle}</p>
        </div>
      </AnimatedWrapper>

      {/* ── Comparison table ── */}
      <div className="mt-14 max-w-5xl mx-auto">
        <AnimatedWrapper direction="up" duration={0.5}>
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white/70">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left px-5 py-5 text-stone-500 font-medium">
                    Característica
                  </th>
                  <th className="px-5 py-5 text-center align-bottom">
                    <div className="inline-flex flex-col items-center gap-1.5">
                      <span className="text-stone-700 font-semibold text-base">
                        Básico
                      </span>
                    </div>
                  </th>
                  <th className="px-5 py-5 text-center align-bottom relative">
                    <div className="inline-flex flex-col items-center gap-1.5">
                      <span className="inline-block rounded-full border border-amber-500/40 bg-amber-100 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 whitespace-nowrap">
                        {sitePlans.cardLabels.featuredBadge}
                      </span>
                      <span className="text-amber-700 font-semibold text-base">
                        Profesional
                      </span>
                    </div>
                  </th>
                  <th className="px-5 py-5 text-center align-bottom">
                    <div className="inline-flex flex-col items-center gap-1.5">
                      <span className="text-stone-700 font-semibold text-base">
                        Empresarial
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sitePlans.comparisonRows.map((row, i) => {
                  const isEven = i % 2 === 0;
                  return (
                    <tr key={row.label}>
                      <td className={isEven ? "px-5 py-3.5 text-stone-600 font-medium bg-stone-100/40" : "px-5 py-3.5 text-stone-600 font-medium"}>
                        {row.label}
                      </td>
                      <td className={isEven ? "px-5 py-3.5 text-center text-stone-500 bg-stone-100/40" : "px-5 py-3.5 text-center text-stone-500"}>
                        <CellValue value={row.basic} />
                      </td>
                      <td className={isEven ? "px-5 py-3.5 text-center text-amber-900 font-medium bg-amber-50/70" : "px-5 py-3.5 text-center text-amber-900 font-medium bg-amber-50/40"}>
                        <CellValue value={row.pro} />
                      </td>
                      <td className={isEven ? "px-5 py-3.5 text-center text-stone-700 bg-stone-100/40" : "px-5 py-3.5 text-center text-stone-700"}>
                        <CellValue value={row.enterprise} />
                      </td>
                    </tr>
                  );
                })}
                {/* CTA row */}
                <tr className="border-t border-stone-200">
                  <td className="px-5 py-5"></td>
                  <td className="px-5 py-5 text-center">
                    <Button asChild size="sm" className="w-full">
                      <Link href={getPlanWhatsAppUrl("Básico")}>
                        {sitePlans.buttonText}
                      </Link>
                    </Button>
                  </td>
                  <td className="px-5 py-5 text-center bg-amber-50/70">
                    <Button asChild size="sm" className="w-full bg-amber-500 hover:bg-amber-600 text-white shadow-sm">
                      <Link href={getPlanWhatsAppUrl("Profesional")}>
                        {sitePlans.buttonText}
                      </Link>
                    </Button>
                  </td>
                  <td className="px-5 py-5 text-center">
                    <Button asChild size="sm" className="w-full">
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

      <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-stone-500">
        {sitePlans.footerText}
      </p>

      <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 text-center">
        <p className="text-sm font-medium text-amber-800">
          {sitePlans.guaranteeText}
        </p>
      </div>

      <div className="mt-10 rounded-lg border border-amber-300 bg-white p-7 text-center shadow-lg">
        <p className="text-lg font-semibold text-stone-800">
          {sitePlans.advisoryCta.title}
        </p>
        <p className="mt-2 text-sm text-stone-500">
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
