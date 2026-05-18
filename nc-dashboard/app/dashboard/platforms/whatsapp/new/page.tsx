"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWhatsAppNumbers } from "@/hooks/use-whatsapp-numbers";
import { useTenants } from "@/hooks/use-tenants";
import { WhatsAppForm } from "@/app/dashboard/whatsapp/components/whatsapp-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ApiError } from "@/lib/api";
import { toast } from "sonner";
import type { WhatsAppNumberFormValues } from "@/lib/schemas/whatsapp";

export default function PlatformsNewWhatsAppPage() {
  const router = useRouter();
  const { createNumber } = useWhatsAppNumbers();
  const { tenants, isLoading: loadingTenants } = useTenants();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: WhatsAppNumberFormValues) => {
    setIsSubmitting(true);

    try {
      const number = await createNumber(data);
      toast.success("Número registrado exitosamente");
      router.push(`/dashboard/platforms/whatsapp/${number.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          toast.error("El Phone Number ID ya está registrado.");
        } else {
          toast.error("Error al registrar el número. Intenta de nuevo.");
        }
      } else {
        toast.error("Error de conexión.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/platforms/whatsapp">
            <ArrowLeft className="mr-2 size-4" />
            Volver a Números
          </Link>
        </Button>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold tracking-tight">
            Registrar Número WhatsApp
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Asocia un número de WhatsApp Business a un negocio.
          </p>
        </CardHeader>
        <CardContent>
          <WhatsAppForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            mode="create"
            tenants={tenants}
            tenantsLoading={loadingTenants}
          />
        </CardContent>
      </Card>
    </div>
  );
}
