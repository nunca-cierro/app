import { landingServices } from "@/data/landing/services";
import { Section } from "@/components/layout/section";
import { AnimatedWrapper } from "@/components/ui/animated-wrapper";
import { Code, Zap, Globe } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

const iconMap = {
  Code,
  Zap,
  Globe,
};

export function LandingServices() {
  return (
    <Section
      id={landingServices.sectionId}
      className="border-stone-700/60 bg-stone-800 text-stone-100"
      containerClassName="max-w-6xl px-3 sm:px-4 lg:px-6"
    >
      <AnimatedWrapper direction="up" duration={0.6}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-amber-300">
            {landingServices.label}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-white md:text-4xl">
            {landingServices.title}
          </h2>
          <p className="mt-2 text-base font-medium text-amber-100 bg-amber-400/15 rounded-lg inline-block px-4 py-2 shadow-sm border border-amber-400/30">
            {landingServices.badge}
          </p>
        </div>
      </AnimatedWrapper>

      <div className="mt-16 grid gap-8 md:grid-cols-3">
        {landingServices.services.map((service) => {
          const IconComponent = iconMap[service.icon as keyof typeof iconMap];
          return (
            <AnimatedWrapper key={service.title} direction="up" duration={0.5} delay={0.1}>
              <Card className="group relative border border-stone-700 bg-stone-900/60 transition-all duration-300 before:absolute before:inset-0 before:rounded-xl before:border before:border-amber-400/0 before:opacity-0 before:transition-all before:duration-300 before:pointer-events-none hover:before:border-amber-400/60 hover:before:opacity-100 hover:-translate-y-1 hover:shadow-[0_0_0_1px_rgba(242,191,39,0.25),0_12px_30px_rgba(0,0,0,0.3)]">
                <CardContent className="p-8">
                  <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-amber-400/20 text-amber-200 border border-amber-400/30">
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <CardTitle className="mt-6 text-xl font-semibold text-white">
                    {service.title}
                  </CardTitle>
                  <p className="mt-3 text-stone-300/80 leading-relaxed">
                    {service.description}
                  </p>
                </CardContent>
              </Card>
            </AnimatedWrapper>
          );
        })}
      </div>
    </Section>
  );
}
