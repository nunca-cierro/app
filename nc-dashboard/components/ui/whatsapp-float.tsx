import { FaWhatsapp } from "react-icons/fa";
import { siteBanner, siteWhatsappFloat } from "@/data/site";

const message = encodeURIComponent(siteWhatsappFloat.whatsappText);

export function WhatsappFloat() {
  return (
    <a
      href={`https://wa.me/${siteBanner.whatsappNumber}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={siteWhatsappFloat.ariaLabel}
      className="
        fixed bottom-6 right-6 z-50
        w-15 h-15
        rounded-full bg-[#25D366]
        flex items-center justify-center
        shadow-lg hover:scale-110
        transition-transform
      "
    >
      <FaWhatsapp size={34} color="white" className="translate-y-px" />
    </a>
  );
}
