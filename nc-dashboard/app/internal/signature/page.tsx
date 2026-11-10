import type { Metadata } from "next";
import { SignatureGeneratorClient } from "./signature-generator-client";

export const metadata: Metadata = {
  title: "Generador de Firmas Corporativas | Nunca Cierro",
  description: "Herramienta interna para generar firmas de correo oficiales de Nunca Cierro.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function InternalSignaturePage() {
  return <SignatureGeneratorClient />;
}

