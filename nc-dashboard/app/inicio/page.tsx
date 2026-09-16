import type { Metadata } from "next";
import { WhatsappFloat } from "@/components/ui/whatsapp-float";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { LandingContent } from "@/components/landing-content";

export const metadata: Metadata = {
  title: "Sitios web profesionales para negocios en Colombia | NuncaCierro",
  description:
    "Diseñamos sitios web profesionales para tu negocio en Colombia, optimizados para recibir más clientes por WhatsApp. Pago único, sin mensualidades.",
};

export default function PaginaWebPage() {
  return (
    <div className="flex min-h-screen flex-col justify-between bg-background font-sans text-foreground">
      <Header />
      <main className="flex-1">
        <LandingContent />
      </main>
      <WhatsappFloat mode="landing" />
      <Footer />
    </div>
  );
}
