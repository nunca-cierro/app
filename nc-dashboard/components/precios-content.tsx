import Link from "next/link";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Lock } from "lucide-react";
import { siteBanner, sitePlans } from "@/data/site";
import { landingPricing } from "@/data/landing/pricing";
import { preciosPage } from "@/data/precios";

function getWhatsAppUrl(text: string) {
  return `https://wa.me/${siteBanner.whatsappNumber}?text=${encodeURIComponent(text)}`;
}

function getPlanWhatsAppUrl(planName: string) {
  return `${sitePlans.whatsappBaseUrl}${encodeURIComponent(`Quiero el plan ${planName} para mi negocio.`)}`;
}

export function PreciosContent() {
  const { hero, trialNote, corporate } = preciosPage;
  const paidPackages = sitePlans.packages.filter(
    (p) => p.name !== "Corporativo",
  );
  const corporatePackage = sitePlans.packages.find(
    (p) => p.name === "Corporativo",
  );

  return (
    <>
      {/* ── Hero ── */}
      <Section
        id={preciosPage.sectionId}
        className="relative overflow-hidden border-0 bg-stone-800 text-white pt-32 md:pt-40 pb-20"
        containerClassName="max-w-5xl px-3 sm:px-4 lg:px-6"
      >
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-amber-300">
            {hero.label}
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl">
            {hero.title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-stone-300 leading-relaxed">
            {hero.subtitle}
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="bg-amber-500 text-stone-950 hover:bg-amber-400"
            >
              <a
                href={getWhatsAppUrl(hero.cta.primary.whatsappText)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {hero.cta.primary.label}
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/30 bg-black/20 text-white/90 hover:bg-black/35 hover:text-white hover:border-white/50"
            >
              <Link href={hero.cta.secondary.href}>
                {hero.cta.secondary.label}
              </Link>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {hero.trust.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-400/20 bg-white/10 px-4 py-2 text-sm text-amber-200 backdrop-blur-md"
              >
                <Check className="h-4 w-4" strokeWidth={3} />
                {item}
              </span>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Tier cards (Escenario A) ── */}
      <Section
        id="planes"
        className="bg-[#F3EDE0] text-stone-900"
        containerClassName="max-w-6xl px-3 sm:px-4 lg:px-6"
      >
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-amber-600">
            Planes
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-stone-800 md:text-4xl">
            Elige el plan según lo que necesite tu negocio
          </h2>
          <p className="mt-4 text-stone-500">{sitePlans.subtitle}</p>
        </div>

        <div className="mt-14 grid gap-7 md:grid-cols-2 xl:grid-cols-4">
          {paidPackages.map((plan) => (
            <div
              key={plan.name}
              className={`group relative flex h-full flex-col rounded-lg border p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_0_1px_rgba(242,191,39,0.35),0_12px_30px_rgba(242,191,39,0.18)] ${
                plan.featured
                  ? "border-amber-400/60 bg-white shadow-[0_0_0_1px_rgba(242,191,39,0.35),0_20px_40px_rgba(242,191,39,0.15)] scale-[1.02]"
                  : "border-stone-200 bg-white"
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-amber-400/60 bg-amber-500 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                  {sitePlans.cardLabels.featuredBadge}
                </div>
              )}

              <div className="flex-1">
                <h3 className="text-xl font-semibold text-stone-800">
                  {plan.name}
                </h3>
                <p className="mt-3 text-3xl font-bold text-stone-800">
                  {plan.price}
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
                  className={`w-full ${
                    plan.featured
                      ? "bg-amber-500 text-stone-950 hover:bg-amber-400"
                      : "border-stone-300 text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  <a
                    href={getPlanWhatsAppUrl(plan.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {sitePlans.buttonText}
                  </a>
                </Button>
              </div>
            </div>
          ))}

          {/* Corporativo — gated, a cotizar */}
          {corporatePackage && (
            <div className="relative flex h-full flex-col rounded-lg border border-stone-700 bg-stone-900 p-7 text-stone-100 shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-400" />
                <h3 className="text-xl font-semibold text-white">
                  {corporatePackage.name}
                </h3>
              </div>
              <p className="mt-3 text-3xl font-bold text-amber-400">
                {corporatePackage.price}
              </p>
              <p className="mt-4 text-sm text-stone-400">
                {corporatePackage.description}
              </p>

              <ul className="mt-6 space-y-3">
                {corporatePackage.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                    <span className="text-sm text-stone-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-7">
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-amber-400/60 bg-transparent text-amber-300 hover:bg-amber-400/10 hover:text-amber-200"
                >
                  <a
                    href={getWhatsAppUrl(corporate.whatsappText)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {corporate.ctaLabel}
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-stone-500">
          {sitePlans.footerText}
        </p>

        {/* Trial banner — programmed-only */}
        <div className="mx-auto mt-8 max-w-3xl rounded-xl border border-amber-400/60 bg-amber-50 px-6 py-6 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
            {sitePlans.trialInfo.label} · {sitePlans.trialInfo.days} días
          </p>
          <p className="mt-2 text-base font-medium text-amber-900">
            {sitePlans.trialInfo.description}
          </p>
          <p className="mt-1 text-sm text-amber-700">{trialNote}</p>
        </div>

        {/* Advisory CTA */}
        <div className="mx-auto mt-10 max-w-3xl rounded-lg border border-amber-300 bg-white p-7 text-center shadow-lg">
          <p className="text-lg font-semibold text-stone-800">
            {sitePlans.advisoryCta.title}
          </p>
          <p className="mt-2 text-sm text-stone-500">
            {sitePlans.advisoryCta.description}
          </p>
          <div className="mt-5">
            <Button asChild className="px-7">
              <a
                href={getWhatsAppUrl(sitePlans.advisoryCta.whatsappText)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {sitePlans.advisoryCta.buttonText}
              </a>
            </Button>
          </div>
        </div>
      </Section>

      {/* ── Secondary: web service (separate product line) ── */}
      <Section
        id="sitios-web"
        className="border-stone-700/60 bg-stone-800 text-stone-100"
        containerClassName="max-w-4xl px-3 sm:px-4 lg:px-6"
      >
        <div className="rounded-2xl border border-stone-700 bg-stone-900/60 px-6 py-8 text-center sm:px-10">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-300/80">
            Sitios web — servicio aparte
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-balance text-stone-100 md:text-3xl">
            ¿También buscas una página web profesional?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-stone-400 leading-relaxed">
            Los sitios web son un servicio único, no mensual:{" "}
            {landingPricing.packages[0].price}, con entrega y acompañamiento.
          </p>
          <div className="mt-6">
            <Link
              href="/inicio#precios"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-medium text-white/90 transition-all hover:bg-white/20 hover:border-white/40 no-underline"
            >
              Ver planes de sitios web
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}