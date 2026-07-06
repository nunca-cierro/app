"use client";

import { useCallback, useRef } from "react";
import { Download, Share2, Smartphone, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  QrDisplay — QR code image with share & download                    */
/*  Accepts a base64 PNG from Evolution API and renders it cleanly.   */
/* ------------------------------------------------------------------ */

interface QrDisplayProps {
  /** Base64-encoded PNG from Evolution API (without `data:image/png;base64,` prefix). */
  qrCode: string;
  /** Show a spinner below the QR indicating we're waiting for the scan. */
  isPolling?: boolean;
  /** Size in Tailwind classes, e.g. "size-64". Default "size-72". */
  size?: string;
  /** Name to use for the downloaded file (e.g. client/connection name). */
  connectionName?: string;
}

export function QrDisplay({
  qrCode,
  isPolling = false,
  size = "size-72",
  connectionName = "whatsapp-qr",
}: QrDisplayProps) {
  const imgRef = useRef<HTMLImageElement>(null);

  /* ── Download QR as PNG ──────────────────────────────────────────── */
  const handleDownload = useCallback(() => {
    const link = document.createElement("a");
    link.download = `${connectionName
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúüñ\- ]/g, "")  // keep letters, numbers, spaces
      .replace(/\s+/g, "-")                    // spaces → hyphens
      .replace(/-+/g, "-")                     // no double hyphens
      .replace(/^-|-$/g, "")                   // trim hyphens
    }.png`;
    link.href = `data:image/png;base64,${qrCode}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("QR descargado", {
      description: "Ya puedes compartirlo con tu cliente.",
    });
  }, [qrCode, connectionName]);

  /* ── Share QR via Web Share API (mobile) or fallback to download ── */
  const handleShare = useCallback(async () => {
    // Convert base64 to a Blob for sharing
    try {
      const byteCharacters = atob(qrCode);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/png" });
      const file = new File([blob], `${connectionName}.png`, {
        type: "image/png",
      });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Código QR WhatsApp",
          text: "Escanea este código QR con WhatsApp para conectar tu número.",
          files: [file],
        });
      } else {
        // Fallback: download instead
        handleDownload();
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        // User cancelled share — not an error
        handleDownload();
      }
    }
  }, [qrCode, connectionName, handleDownload]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* ── QR Image ── */}
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={`data:image/png;base64,${qrCode}`}
          alt="Código QR para conectar WhatsApp"
          className={`${size} rounded-xl border-2 border-border bg-white p-1 shadow-lg`}
        />

        {/* WhatsApp icon watermark */}
        <div className="absolute -bottom-2 -right-2 rounded-full border-2 border-background bg-green-500 p-2 shadow-md">
          <Smartphone className="size-5 text-white" />
        </div>
      </div>

      {/* ── Instructions ── */}
      <div className="max-w-xs text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">¿Cómo usar este QR?</p>
        <p className="mt-1">
          Comparte este código con tu cliente. Desde su WhatsApp debe ir a{" "}
          <span className="font-semibold text-foreground">
            ⋮ Menú → WhatsApp Web
          </span>{" "}
          y escanear el QR para conectar su número.
        </p>
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <Button
          onClick={handleShare}
          variant="default"
          className="flex-1 gap-2"
        >
          <Share2 className="size-4" />
          Compartir QR
        </Button>
        <Button
          onClick={handleDownload}
          variant="outline"
          className="flex-1 gap-2"
        >
          <Download className="size-4" />
          Descargar QR
        </Button>
      </div>

      {/* ── Polling indicator ── */}
      {isPolling && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Esperando que el cliente escanee...
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Check className="size-3" />
            QR activo por 30 escaneos
          </span>
        </div>
      )}
    </div>
  );
}
