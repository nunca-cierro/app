"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePlatformConnections } from "@/hooks/use-platform-connections";
import { useTenants } from "@/hooks/use-tenants";
import { EvolutionForm } from "@/app/dashboard/platforms/whatsapp/components/evolution-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { EvolutionFormValues } from "@/lib/schemas/evolution";

export default function PlatformsNewEvolutionPage() {
  const router = useRouter();
  const { createConnection } = usePlatformConnections();
  const { tenants, isLoading: loadingTenants } = useTenants();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: EvolutionFormValues) => {
    setIsSubmitting(true);

    try {
      // Transform form data to match API connection schema
      const connection = await createConnection({
        tenant_id: data.tenant_id,
        platform_type: "evolution",
        display_name: data.display_name,
        status: data.status,
        is_primary: data.is_primary,
        credentials: {
          base_url: data.base_url,
          api_key: data.api_key,
          instance_name: data.instance_name,
        },
      });

      toast.success("Conexión con Evolution API creada exitosamente");
      router.push(`/dashboard/platforms/evolution/${connection.id}`);
    } catch (err) {
      toast.error("Error al crear la conexión. Verifica los datos.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/platforms">
            <ArrowLeft className="mr-2 size-4" />
            Volver a Plataformas
          </Link>
        </Button>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold tracking-tight">
            Conectar WhatsApp (Evolution API)
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Configura tu instancia de Evolution API para automatizar WhatsApp.
          </p>
        </CardHeader>
        <CardContent>
          <EvolutionForm
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
