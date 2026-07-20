import { landingProcess } from "@/data/landing/process";
import { Section } from "@/components/layout/section";
import { AnimatedWrapper } from "@/components/ui/animated-wrapper";
import { Card, CardContent } from "@/components/ui/card";

export function LandingProcess() {
  return (
    <Section
      id={landingProcess.sectionId}
      className="bg-[#F3EDE0] text-stone-900 border-stone-200/80"
      containerClassName="max-w-6xl px-3 sm:px-4 lg:px-6"
    >
      <AnimatedWrapper direction="up" duration={0.6}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-amber-600">
            {landingProcess.label}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-stone-800 md:text-4xl">
            {landingProcess.title}
          </h2>
          <p className="mt-4 text-stone-500/80">{landingProcess.subtitle}</p>
        </div>
      </AnimatedWrapper>

      <div className="mt-16 w-full">
        <div className="relative flex flex-col md:flex-row items-stretch md:items-start justify-center gap-8 md:gap-8 w-full">
          <div
            className="hidden md:block absolute left-0 right-0 top-6 h-1 bg-amber-400/30 z-0"
            style={{ zIndex: 0 }}
          />
          {landingProcess.steps.map((step) => (
            <div
              key={step.number}
              className="flex flex-col items-center flex-1 min-w-0 mb-8 md:mb-0"
            >
              <AnimatedWrapper direction="up" duration={0.5} delay={0.1 * parseInt(step.number)}>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-amber-400/80 text-stone-900 font-bold text-lg border-4 border-[#F3EDE0] shadow-lg z-10">
                    {step.number}
                  </div>
                  <span className="mt-2 text-sm font-semibold text-amber-700">
                    {landingProcess.stepLabelPrefix} {step.number}
                  </span>
                </div>
                <Card className="w-full mt-4 border border-stone-200 bg-white transition-all duration-300">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-stone-800 text-center">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm text-stone-600 leading-relaxed text-center">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              </AnimatedWrapper>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 text-center">
        <p className="text-base text-amber-700 rounded-lg inline-block px-4 py-2">
          {landingProcess.footerText}
        </p>
      </div>
    </Section>
  );
}
