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
      try {
        await navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        toast.success("Número copiado al portapapeles");
        setTimeout(() => setCopiedIndex(null), 2000);
      } catch {
        toast.error("No se pudo copiar el número");
      }
    },
    [],
  );

  const handleWhatsApp = useCallback(() => {
    if (!paymentInfo) return;
    const message = encodeURIComponent(
      `Hola, soy cliente de NuncaCierro. Quiero enviar el comprobante de pago del plan ${planLabel}. Mi número de cuenta es el registrado en la plataforma.`,
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
          Realizá la transferencia o el depósito a una de las siguientes
          cuentas y luego enviá el comprobante por WhatsApp.
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
          {/* QR Code */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Código QR para {planLabel}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div className="relative size-48 overflow-hidden rounded-lg border">
                <Image
                  src={qrUrl}
                  alt={`QR ${planLabel}`}
                  fill
                  className="object-contain"
                  sizes="192px"
                  onError={() =>
                    toast.error("No se pudo cargar el código QR")
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment methods */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">
              Datos para la transferencia
            </h2>
            <p className="text-muted-foreground text-sm">
              Titular: <span className="font-medium">{paymentInfo.account_holder}</span>
            </p>

            {paymentInfo.methods.map((method, i) => (
              <Card key={i}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                        <Wallet className="size-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{method.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {method.number}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(method.number, i)}
                  >
                    {copiedIndex === i ? (
                      <>
                        <Check className="mr-1 size-3" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 size-3" />
                        Copiar
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* WhatsApp CTA */}
          <Button className="w-full" size="lg" onClick={handleWhatsApp}>
            <svg
              className="mr-2 size-5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Enviar comprobante por WhatsApp
          </Button>

          <p className="text-muted-foreground text-center text-xs">
            Una vez realizado el pago, envianos el comprobante por WhatsApp y
            activaremos tu plan a la brevedad.
          </p>
        </>
      )}
    </div>
  );
}
