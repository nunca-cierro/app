"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePlatformConnections } from "@/hooks/use-platform-connections";
import { useTenants } from "@/hooks/use-tenants";
import { TelegramForm } from "@/components/telegram-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ApiError } from "@/lib/api";
import { toast } from "sonner";
import type { TelegramConnectionFormValues } from "@/lib/schemas/telegram";

export default function NewTelegramConnectionPage() {
  const router = useRouter();
  const { createConnection } = usePlatformConnections();
  const { tenants, isLoading: loadingTenants } = useTenants();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: TelegramConnectionFormValues) => {
    setIsSubmitting(true);

    try {
      const conn = await createConnection({
        tenant_id: data.tenant_id,
        platform_type: "telegram",
        display_name: data.display_name,
        credentials: {
          bot_token: data.bot_token,
          bot_username: data.bot_username,
        },
        extra_data: {
          bot_token: data.bot_token,
          bot_username: data.bot_username,
        },
      });
      toast.success("Conexión de Telegram registrada exitosamente");
      router.push(`/dashboard/platforms/telegram/${conn.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          toast.error("Ya existe una conexión con ese token.");
        } else {
          toast.error("Error al registrar la conexión. Intenta de nuevo.");
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
          <Link href="/dashboard/platforms/telegram">
            <ArrowLeft className="mr-2 size-4" />
            Volver a Telegram
          </Link>
        </Button>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold tracking-tight">
            Conectar Bot de Telegram
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Configura un bot de Telegram para recibir y enviar mensajes.
            Necesitas el token que te proporcionó @BotFather.
          </p>
        </CardHeader>
        <CardContent>
          <TelegramForm
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
