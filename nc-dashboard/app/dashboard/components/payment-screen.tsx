"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { ArrowLeft, Copy, Check, Loader2, AlertCircle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBilling } from "@/hooks/use-billing";
import { PLAN_LABELS } from "@/lib/plans";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Plan QR path mapping                                               */
/* ------------------------------------------------------------------ */

const PLAN_QR_MAP: Record<string, string> = {
  basic: "/payment/QRBasico.jpeg",
  professional: "/payment/QRProfesional.jpeg",
  enterprise: "/payment/QREmpresarial.jpeg",
};

/* ------------------------------------------------------------------ */
/*  PaymentScreen                                                      */
/* ------------------------------------------------------------------ */

export interface PaymentScreenProps {
  planKey: string;
  onBack: () => void;
}

export function PaymentScreen({ planKey, onBack }: PaymentScreenProps) {
  const { paymentInfo, isLoading, error, fetchPaymentInfo } = useBilling();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchPaymentInfo();
  }, [fetchPaymentInfo]);

  const qrUrl = PLAN_QR_MAP[planKey] ?? `/payment/QRBasico.jpeg`;
  const planLabel = PLAN_LABELS[planKey] ?? planKey;

  const handleCopy = useCallback(
    async (text: string, index: number) => {
      if (!text) {
        toast.error("No hay número para copiar");
        return;
      }
      let ok = false;
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          ok = true;
        } else {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.top = "0";
          ta.style.left = "0";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          ok = document.execCommand("copy");
          document.body.removeChild(ta);
        }
      } catch {
        ok = false;
      }
      if (ok) {
        setCopiedIndex(index);
        toast.success("Número copiado al portapapeles");
        setTimeout(() => setCopiedIndex(null), 2000);
      } else {
        toast.error("No se pudo copiar el número");
      }
    },
    [],
  );

  const handleWhatsApp = useCallback(() => {
    if (!paymentInfo) return;
    const methodsList = paymentInfo.methods
      .map((m) => `• ${m.name}: ${m.number}`)
      .join("\n");
    const message = encodeURIComponent(
      `Hola! Soy cliente de NuncaCierro.\n\n` +
        `Quiero enviar el comprobante de pago del plan *${planLabel}*.\n\n` +
        `Datos de transferencia:\n` +
        `Titular: ${paymentInfo.account_holder}\n` +
        `${methodsList}\n\n` +
        `Adjunto el comprobante en la siguiente imagen.`,
    );
    window.open(
      `https://wa.me/57${paymentInfo.methods[0]?.number.replace(/[^0-9]/g, "")}?text=${message}`,
      "_blank",
    );
  }, [paymentInfo, planLabel]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="mr-1 size-4" />
        Volver a planes
      </Button>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Pagar Plan {planLabel}
        </h1>
        <p className="text-muted-foreground mt-1">
          Realiza la transferencia o el depósito a una de las siguientes
          cuentas y luego envía el comprobante por WhatsApp.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {paymentInfo && (
        <>
          {/* QR Code — large and sharp for scanning */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/30 pb-3">
              <CardTitle className="text-center text-base font-semibold">
                Escanea este código QR para {planLabel}
              </CardTitle>
              <p className="text-muted-foreground text-center text-xs">
                Haz una captura o muéstralo directamente
              </p>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 pt-6">
              <div className="relative w-[26rem] overflow-hidden rounded-xl border border-warning/60 bg-white shadow-lg aspect-[1220/2592] sm:w-[32rem]">
                <Image
                  src={qrUrl}
                  alt={`QR ${planLabel}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 384px, 448px"
                  priority
                  onError={() =>
                    toast.error("No se pudo cargar el código QR")
                  }
                />
              </div>
              <p className="text-muted-foreground text-center text-xs">
                También puedes usar los datos de transferencia abajo
              </p>
            </CardContent>
          </Card>

          {/* Payment methods */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Paso 1: Realiza la transferencia
              </CardTitle>
              <p className="text-muted-foreground text-xs">
                Titular: <span className="font-medium text-foreground">{paymentInfo.account_holder}</span>
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {paymentInfo.methods.map((method, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border bg-background p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                      <Wallet className="size-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{method.name}</p>
                      <p className="text-muted-foreground text-xs font-mono">
                        {method.number}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(method.number, i)}
                    className="border-primary/20 hover:bg-primary/5"
                  >
                    {copiedIndex === i ? (
                      <>
                        <Check className="mr-1 size-3 text-green-600" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 size-3" />
                        Copiar
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* WhatsApp CTA */}
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <p className="mb-3 text-center text-sm font-medium">
                Paso 2: Envíanos el comprobante
              </p>
              <Button
                className="w-full bg-green-600 text-white shadow-md transition-all hover:bg-green-700 hover:shadow-lg"
                size="lg"
                onClick={handleWhatsApp}
              >
                <svg
                  className="mr-2 size-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Enviar comprobante por WhatsApp
              </Button>
              <p className="text-muted-foreground mt-3 text-center text-xs">
                Te responderemos apenas verifiquemos el pago
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
