"use client";

import { Loader2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  QrDisplay — QR code image with polling status                      */
/*  Accepts a base64 PNG from Evolution API and renders it cleanly.    */
/* ------------------------------------------------------------------ */

interface QrDisplayProps {
  /** Base64-encoded PNG from Evolution API (without `data:image/png;base64,` prefix). */
  qrCode: string;
  /** Show a spinner below the QR indicating we're waiting for the scan. */
  isPolling?: boolean;
  /** Size in Tailwind classes, e.g. "size-64". Default "size-64". */
  size?: string;
}

export function QrDisplay({ qrCode, isPolling = false, size = "size-64" }: QrDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`data:image/png;base64,${qrCode}`}
        alt="WhatsApp QR Code"
        className={`${size} rounded-lg border`}
      />

      {isPolling && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Esperando escaneo...
        </div>
      )}
    </div>
  );
}
