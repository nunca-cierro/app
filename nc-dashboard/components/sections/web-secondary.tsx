import Link from "next/link";
import { Section } from "@/components/layout/section";
import { AnimatedWrapper } from "@/components/ui/animated-wrapper";
import { ArrowRight } from "lucide-react";
import { siteWebSecondary } from "@/data/site";

/**
 * Secondary-offer strip on the automation-first home: demotes the web-design
 * service (one-time payment, separate product line) to a discreet link, so the
 * home stays focused on WhatsApp automation.
 */
export function WebSecondary() {
  return (
    <Section
      id="sitios-web"
      className="border-stone-700/60 bg-stone-800 text-stone-100"
      containerClassName="max-w-4xl px-3 sm:px-4 lg:px-6"
    >
      <AnimatedWrapper direction="up" duration={0.6}>
        <div className="rounded-2xl border border-stone-700 bg-stone-900/60 px-6 py-8 text-center sm:px-10">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-300/80">
            {siteWebSecondary.label}
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-balance text-stone-100 md:text-3xl">
            {siteWebSecondary.title}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-stone-400 leading-relaxed">
            {siteWebSecondary.description}
          </p>
          <div className="mt-6">
            <Link
              href={siteWebSecondary.href}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-medium text-white/90 transition-all hover:bg-white/20 hover:border-white/40 no-underline"
            >
              {siteWebSecondary.ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </AnimatedWrapper>
    </Section>
  );
}