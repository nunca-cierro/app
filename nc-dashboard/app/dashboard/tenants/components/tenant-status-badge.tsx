import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */

interface TenantStatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500",
  inactive: "bg-yellow-500",
  suspended: "bg-red-500",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  inactive: "Inactivo",
  suspended: "Suspendido",
};

export function TenantStatusBadge({
  status,
  className,
}: TenantStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
    >
      <span
        className={cn(
          "inline-block size-1.5 rounded-full",
          STATUS_STYLES[status] ?? "bg-gray-400",
        )}
      />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
