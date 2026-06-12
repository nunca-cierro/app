"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { apiClient, ApiError } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, Loader2 } from "lucide-react";

export function OnboardingWizard() {
  const router = useRouter();
  const { user, switchTenant } = useAuth();
  const [tenantName, setTenantName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      // Generate a slug from the tenant name
      const slug = tenantName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 100);

      // Create the tenant via API (tenantless users are auto-assigned as admin)
      const tenant = await apiClient<{ id: string }>("/api/v1/tenants", {
        method: "POST",
        body: JSON.stringify({ name: tenantName, slug }),
      });

      // Switch tenant via useAuth's switchTenant — updates both JWT token
      // and React auth context (prevents stale context redirect loop)
      await switchTenant(tenant.id);

      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.status === 409
          ? "El slug ya existe. Probá con otro nombre."
          : err.message;
        setError(msg);
      } else {
        setError("Error de conexión. Intenta de nuevo.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="size-7 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Creá tu negocio
            </CardTitle>
            <CardDescription className="mt-2">
              Ingresá el nombre de tu negocio para empezar a usar NuncaCierro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div
                  role="alert"
                  className="rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                >
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="tenant-name" className="text-sm font-medium">
                  Nombre del negocio
                </label>
                <Input
                  id="tenant-name"
                  type="text"
                  placeholder="Ej: Mi Tienda Online"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !tenantName.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  "Crear negocio"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
