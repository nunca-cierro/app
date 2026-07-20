"use client";

import { FaWhatsapp } from "react-icons/fa";
import { siteBanner, siteWhatsappFloat } from "@/data/site";

export type Mode = "automation" | "landing";

const automationMessage = encodeURIComponent(siteWhatsappFloat.whatsappText);
const landingMessage = encodeURIComponent(
  "Hola, vi NuncaCierro y quiero una página web con WhatsApp para mi negocio.\n\nMi negocio es: \nCiudad: \n¿Qué tipo de página necesito?: \n\n¿Qué información necesitas de mí?",
);

type Props = {
  mode?: Mode;
};

export function WhatsappFloat({ mode = "automation" }: Props) {
  const message = mode === "landing" ? landingMessage : automationMessage;

  return (
    <a
      href={`https://wa.me/${siteBanner.whatsappNumber}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={siteWhatsappFloat.ariaLabel}
      className="fixed bottom-6 right-6 z-50 w-15 h-15 rounded-full bg-[#25D366] flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110"
    >
      <FaWhatsapp size={34} color="white" className="translate-y-px" />
    </a>
  );
}
