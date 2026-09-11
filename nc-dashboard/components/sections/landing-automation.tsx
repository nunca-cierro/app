import Link from "next/link";
import { Section } from "@/components/layout/section";
import { ArrowRight, Bot } from "lucide-react";
import { landingAutomation } from "@/data/landing/automation";

export function LandingAutomation() {
  return (
    <Section
      id={landingAutomation.sectionId}
      className="border-stone-700/60 bg-stone-800 text-stone-100"
      containerClassName="max-w-4xl px-3 sm:px-4 lg:px-6"
    >
      <div className="rounded-2xl border border-amber-400/30 bg-stone-900/60 px-6 py-9 text-center sm:px-10">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300 border border-amber-400/30">
          <Bot className="h-6 w-6" />
        </div>
        <p className="mt-4 text-xs font-medium uppercase tracking-wider text-amber-300/80">
          {landingAutomation.label}
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-balance text-stone-100 md:text-3xl">
          {landingAutomation.title}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-stone-400 leading-relaxed">
          {landingAutomation.description}
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={landingAutomation.primary.href}
            className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-stone-950 transition-all hover:bg-amber-400 hover:-translate-y-0.5 hover:shadow-lg no-underline"
          >
            {landingAutomation.primary.ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={landingAutomation.secondary.href}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-medium text-white/90 transition-all hover:bg-white/20 hover:border-white/40 no-underline"
          >
            {landingAutomation.secondary.ctaLabel}
          </Link>
        </div>
      </div>
    </Section>
  );
}