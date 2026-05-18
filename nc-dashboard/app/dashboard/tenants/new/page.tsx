"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTenants } from "@/hooks/use-tenants";
import { TenantForm } from "@/app/dashboard/tenants/components/tenant-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ApiError } from "@/lib/api";
import { toast } from "sonner";
import type { TenantFormValues } from "@/lib/schemas/tenant";

export default function NewTenantPage() {
  const router = useRouter();
  const { createTenant } = useTenants();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: TenantFormValues) => {
    setIsSubmitting(true);

    try {
      const tenant = await createTenant(data);
      toast.success("Negocio creado exitosamente");
      router.push(`/dashboard/tenants/${tenant.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          toast.error("El slug ya está en uso. Elige otro.");
        } else {
          toast.error("Error al crear el negocio. Intenta de nuevo.");
        }
      } else {
        toast.error("Error de conexión. Verifica tu conexión a internet.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Back ── */}
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/tenants">
            <ArrowLeft className="mr-2 size-4" />
            Volver a Negocios
          </Link>
        </Button>
      </div>

      {/* ── Form ── */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold tracking-tight">
            Nuevo Negocio
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Registra un nuevo negocio en la plataforma.
          </p>
        </CardHeader>
        <CardContent>
          <TenantForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            mode="create"
          />
        </CardContent>
      </Card>
    </div>
  );
}
