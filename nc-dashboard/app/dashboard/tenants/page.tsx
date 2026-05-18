"use client";

import { useTenants } from "@/hooks/use-tenants";
import { TenantList } from "@/app/dashboard/tenants/components/tenant-list";

export default function TenantsPage() {
  const { tenants, isLoading, error } = useTenants();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Negocios</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Gestiona los negocios registrados en la plataforma.
        </p>
      </div>

      <TenantList tenants={tenants} isLoading={isLoading} error={error} />
    </div>
  );
}
