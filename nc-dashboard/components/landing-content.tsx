import { LandingHero } from "@/components/sections/landing-hero";
import { LandingServices } from "@/components/sections/landing-services";
import { LandingProcess } from "@/components/sections/landing-process";
import { LandingExamples } from "@/components/sections/landing-examples";
import { LandingPricing } from "@/components/sections/landing-pricing";
import { LandingFaq } from "@/components/sections/landing-faq";
import { LandingContact } from "@/components/sections/landing-contact";

export function LandingContent() {
  return (
    <>
      <LandingHero />
      <LandingServices />
      <LandingProcess />
      <LandingExamples />
      <LandingPricing />
      <LandingFaq />
      <LandingContact />
    </>
  );
}
