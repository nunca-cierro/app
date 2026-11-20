"use client";

import { FaWhatsapp } from "react-icons/fa";
import { siteBanner, siteWhatsappFloat } from "@/data/site";

const automationMessage = encodeURIComponent(
  "Hola, vi NuncaCierro y quiero información sobre los planes de automatización.\n\nMi negocio es: \nCiudad: \n¿Qué problema tengo?: \n\n¿Qué información necesita de mí?",
);

export function WhatsappFloat() {
  return (
    <a
      href={`https://wa.me/${siteBanner.whatsappNumber}?text=${automationMessage}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={siteWhatsappFloat.ariaLabel}
      className="fixed bottom-6 right-6 z-50 w-15 h-15 rounded-full bg-[#25D366] flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110"
    >
      <FaWhatsapp size={34} color="white" className="translate-y-px" />
    </a>
  );
}
