import type { Metadata } from "next";
import { WhatsappFloat } from "@/components/ui/whatsapp-float";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { AutomationContent } from "@/components/automation-content";
import { siteMetadata } from "@/data/site";

export const metadata: Metadata = {
  title: "Automatización WhatsApp para negocios en Colombia",
  description: siteMetadata.description,
};

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col justify-between bg-background font-sans text-foreground">
      <Header />
      <main className="flex-1">
        <AutomationContent />
      </main>
      <WhatsappFloat mode="automation" />
      <Footer />
    </div>
  );
}