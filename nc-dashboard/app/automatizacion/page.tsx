import { WhatsappFloat } from "@/components/ui/whatsapp-float";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { AutomationContent } from "@/components/automation-content";

export default function AutomatizacionPage() {
  return (
    <div className="flex min-h-screen flex-col justify-between bg-background font-sans text-foreground">
      <Header />
      <main className="flex-1">
        <AutomationContent />
      </main>
      <WhatsappFloat />
      <Footer />
    </div>
  );
}
