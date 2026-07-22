import { WhatsappFloat } from "@/components/ui/whatsapp-float";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { LandingContent } from "@/components/landing-content";

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
