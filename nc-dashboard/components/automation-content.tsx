import { Hero } from "@/components/sections/hero";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Businesses } from "@/components/sections/businesses";
import { Plans } from "@/components/sections/plans";
import { Faq } from "@/components/sections/faq";
import { Contact } from "@/components/sections/contact";

export function AutomationContent() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Businesses />
      <Plans />
      <Faq />
      <Contact />
    </>
  );
}
