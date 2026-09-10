import type { Metadata } from "next";
import { WhatsappFloat } from "@/components/ui/whatsapp-float";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { PreciosContent } from "@/components/precios-content";

export const metadata: Metadata = {
  title: "Planes y precios de automatización WhatsApp",
  description:
    "Planes de automatización WhatsApp para negocios en Colombia: respuestas automáticas, IA y atención 24/7. Desde $390.000/mes + IVA. Prueba 7 días gratis.",
};

export default function PreciosPage() {
  return (
    <div className="flex min-h-screen flex-col justify-between bg-background font-sans text-foreground">
      <Header />
      <main className="flex-1">
        <PreciosContent />
      </main>
      <WhatsappFloat mode="automation" />
      <Footer />
    </div>
  );
}