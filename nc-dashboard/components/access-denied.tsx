"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

/**
 * Rendered when an authenticated user reaches a page they cannot use (e.g. a
 * client hitting a create flow by direct URL). Defense in depth — the layout
 * effect already redirects by role matrix; this covers the guard-window flash
 * before the redirect fires.
 */
export function AccessDeniedCard({
  message = "No tenés permisos para esta acción",
}: {
  message?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <ShieldAlert className="size-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}