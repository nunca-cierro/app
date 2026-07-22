import Link from "next/link";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AnimatedWrapper } from "@/components/ui/animated-wrapper";
import { Check, ChevronDown } from "lucide-react";
import { siteBanner } from "@/data/site";
import { landingPricing } from "@/data/landing/pricing";

function getWhatsAppUrl(text: string) {
  return `https://wa.me/${siteBanner.whatsappNumber}?text=${encodeURIComponent(text)}`;
}

function getPlanWhatsAppUrl(planName: string) {
  return `${landingPricing.whatsappBaseUrl}${encodeURIComponent(planName)}`;
}

export function LandingPricing() {
  return (
    <Section
      id={landingPricing.sectionId}
      className="bg-[#F3EDE0] text-stone-900 border-stone-200/80"
      containerClassName="max-w-6xl px-3 sm:px-4 lg:px-6"
    >
      <AnimatedWrapper direction="up" duration={0.6}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-amber-600">
            {landingPricing.label}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-stone-800 md:text-4xl">
            {landingPricing.title}
          </h2>
          <p className="mt-4 text-stone-500/80">{landingPricing.subtitle}</p>
        </div>
      </AnimatedWrapper>

      <div className="mt-14 grid gap-7 md:grid-cols-3">
        {landingPricing.packages.map((plan) => (
          <AnimatedWrapper key={plan.name} direction="up" duration={0.5} delay={0.1}>
            <Card
              className={`group relative flex h-full flex-col rounded-lg border p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_0_1px_rgba(242,191,39,0.35),0_12px_30px_rgba(242,191,39,0.18)] ${
                plan.featured
                  ? "border-amber-400/60 bg-white shadow-[0_0_0_1px_rgba(242,191,39,0.35),0_20px_40px_rgba(242,191,39,0.15)] scale-[1.02]"
                  : "border-stone-200 bg-white"
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-amber-400/60 bg-amber-500 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                  {landingPricing.cardLabels.featuredBadge}
                </div>
              )}

              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
                  {plan.featured
                    ? landingPricing.cardLabels.featured
                    : landingPricing.cardLabels.default}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-stone-800">
                  {plan.name}
                </h3>
                <p className="mt-3 text-3xl font-bold text-stone-800">
                  {plan.price}
                </p>
                <p className="mt-1 text-xs font-medium text-amber-600">
                  {landingPricing.installmentNote}
                </p>
                <p className="mt-4 text-sm text-stone-500">
                  {plan.description}
                </p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                      <span className="text-sm text-stone-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-7">
                <Button
                  asChild
                  variant={plan.featured ? "default" : "outline"}
                  className={`w-full ${plan.featured ? "bg-amber-500 text-stone-950 hover:bg-amber-400" : "border-stone-300 text-stone-700 hover:bg-stone-100"}`}
                >
                  <Link href={getPlanWhatsAppUrl(plan.name)}>
                    {landingPricing.buttonText}
                  </Link>
                </Button>
              </div>
            </Card>
          </AnimatedWrapper>
        ))}
      </div>

      <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-stone-500">
        {landingPricing.footerText}
      </p>

      <div className="mt-8 rounded-lg border border-amber-400/60 bg-amber-50 px-5 py-4 text-center shadow-sm">
        <p className="text-sm font-medium text-amber-800">
          {landingPricing.guaranteeText}
        </p>
      </div>

      <div className="mt-12">
        <h3 className="text-2xl font-semibold tracking-tight text-stone-800 text-center">
          {landingPricing.comparison.title}
        </h3>
        <p className="mt-3 text-center text-stone-500">
          {landingPricing.comparison.subtitle}
        </p>

        <div className="mt-6 rounded-lg border border-stone-200 bg-white p-5 md:p-6">
          <div className="grid grid-cols-4 border-b border-stone-200 pb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
            <span>{landingPricing.comparison.includedLabel}</span>
            {landingPricing.packages.map((plan) => (
              <span
                key={plan.name}
                className={`text-center ${plan.featured ? "text-amber-600" : ""}`}
              >
                {plan.name}
              </span>
            ))}
          </div>

          <div className="mt-3 space-y-2">
            {landingPricing.comparison.rows.map((row) => (
              <div
                key={row.item}
                className="grid grid-cols-4 items-center rounded-md px-2 py-2 text-sm text-stone-600 transition-colors hover:bg-stone-100"
              >
                <span className="pr-3">{row.item}</span>
                {landingPricing.packages.map((plan, packageIndex) => (
                  <span
                    key={`${row.item}-${plan.name}`}
                    className={`text-center ${plan.featured ? "text-amber-600" : ""}`}
                  >
                    {row.included[packageIndex]
                      ? landingPricing.comparison.positiveLabel
                      : landingPricing.comparison.negativeLabel}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-12 max-w-2xl mx-auto">
        <h3 className="text-2xl font-semibold tracking-tight text-stone-800 text-center">
          {landingPricing.optionalExtras.title}
        </h3>
        <p className="mt-3 text-center text-stone-500">
          {landingPricing.optionalExtras.subtitle}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {landingPricing.optionalExtras.items.map((extra, idx) => (
            <details
              key={extra.name}
              className="group overflow-hidden rounded-xl border border-stone-200 bg-white transition-all duration-300 hover:shadow-[0_0_0_1px_rgba(242,191,39,0.25),0_12px_30px_rgba(0,0,0,0.08)]"
            >
              <summary
                className="flex w-full cursor-pointer list-none items-center justify-between px-6 py-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                aria-controls={`landing-extra-panel-${idx}`}
              >
                <div className="flex flex-1 items-center gap-3">
                  <span
                    className="mb-1 text-xl leading-none"
                    aria-hidden="true"
                  >
                    {extra.icon}
                  </span>
                  <div className="flex-1 text-center">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-amber-600/90">
                      {landingPricing.optionalExtras.itemLabel}
                    </p>
                    <h4 className="text-lg font-semibold text-stone-800">
                      {extra.name}
                    </h4>
                  </div>
                </div>
                <span className="ml-4 text-amber-600 transition-transform duration-300 group-open:rotate-180">
                  <ChevronDown className="h-6 w-6" />
                </span>
              </summary>

              <div id={`landing-extra-panel-${idx}`} className="px-6 pb-6">
                <p className="mt-2 text-sm text-stone-600">
                  {extra.description}
                </p>
                <ul className="mt-5 space-y-2">
                  {extra.includes.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <span className="text-sm text-stone-600">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-sm font-semibold text-stone-700">
                  {extra.price}
                </p>
                <div className="mt-4">
                  <Button
                    asChild
                    size="sm"
                    className="bg-amber-500 text-stone-950 hover:bg-amber-400"
                  >
                    <Link
                      href={getWhatsAppUrl(
                        landingPricing.optionalExtras.whatsappTextTemplate.replace(
                          "{extraName}",
                          extra.name,
                        ),
                      )}
                    >
                      {landingPricing.optionalExtras.buttonText}
                    </Link>
                  </Button>
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>

      <div className="mt-12 rounded-lg border border-amber-400/60 bg-white p-7 text-center shadow-[0_0_0_1px_rgba(242,191,39,0.2),0_18px_40px_rgba(0,0,0,0.05)]">
        <p className="text-lg font-semibold text-stone-800">
          {landingPricing.advisoryCta.title}
        </p>
        <p className="mt-2 text-sm text-stone-600">
          {landingPricing.advisoryCta.description}
        </p>
        <div className="mt-5">
          <Button asChild className="px-7 bg-amber-500 text-stone-950 hover:bg-amber-400">
            <Link href={getWhatsAppUrl(landingPricing.advisoryCta.whatsappText)}>
              {landingPricing.advisoryCta.buttonText}
            </Link>
          </Button>
        </div>
      </div>
    </Section>
  );
}
