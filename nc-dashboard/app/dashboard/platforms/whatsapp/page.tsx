"use client";

import { useWhatsAppNumbers } from "@/hooks/use-whatsapp-numbers";
import { WhatsAppList } from "@/app/dashboard/whatsapp/components/whatsapp-list";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function PlatformsWhatsAppPage() {
  const { numbers, isLoading, error } = useWhatsAppNumbers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Números WhatsApp
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gestiona los números telefónicos asociados a cada negocio.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/platforms/whatsapp/new">
            <Plus className="mr-2 size-4" />
            Nuevo Número
          </Link>
        </Button>
      </div>

      <WhatsAppList numbers={numbers} isLoading={isLoading} error={error} />
    </div>
  );
}
