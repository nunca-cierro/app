import { Businesses } from "@/components/sections/businesses";
import { HowItWorks } from "@/components/sections/how-it-works";
import { WhatsappFloat } from "@/components/ui/whatsapp-float";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Contact } from "@/components/sections/contact";
import { Faq } from "@/components/sections/faq";
import { Hero } from "@/components/sections/hero";
import { Plans } from "@/components/sections/plans";
import { Process } from "@/components/sections/process";
import { Services } from "@/components/sections/services";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col justify-between bg-background font-sans text-foreground">
      <Header />
      <Hero />
      <HowItWorks />
      <Services />
      <Process />
      <Businesses />
      <Plans />
      <Faq />
      <Contact />
      <WhatsappFloat />
      <Footer />
    </div>
  );
}
