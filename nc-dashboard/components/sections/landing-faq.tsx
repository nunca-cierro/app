import { landingFaq } from "@/data/landing/faq";
import { Section } from "@/components/layout/section";
import { AnimatedWrapper } from "@/components/ui/animated-wrapper";
import { Card } from "@/components/ui/card";

export function LandingFaq() {
  return (
    <Section
      id={landingFaq.sectionId}
      className="border-stone-700/60 bg-stone-800 text-stone-100"
      containerClassName="max-w-6xl px-3 sm:px-4 lg:px-6"
    >
      <AnimatedWrapper direction="up" duration={0.6}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-amber-300">
            {landingFaq.label}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-white md:text-4xl">
            {landingFaq.title}
          </h2>
          <p className="mt-4 text-stone-300/80">
            {landingFaq.subtitle}
          </p>
        </div>
      </AnimatedWrapper>

      <div className="mx-auto mt-10 grid max-w-6xl gap-4 md:grid-cols-2">
        {landingFaq.items.map((faq) => (
          <AnimatedWrapper key={faq.question} direction="up" duration={0.4} delay={0.05}>
            <Card className="rounded-lg border border-stone-700 bg-stone-900/60 p-6">
              <h3 className="text-base font-semibold text-white">
                {faq.question}
              </h3>
              <p className="mt-2 text-sm text-stone-300">{faq.answer}</p>
            </Card>
          </AnimatedWrapper>
        ))}
      </div>
    </Section>
  );
}
