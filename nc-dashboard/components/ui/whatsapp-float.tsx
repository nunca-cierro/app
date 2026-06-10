"use client";

import { useEffect, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { siteBanner, siteWhatsappFloat } from "@/data/site";
import { cn } from "@/lib/utils";

const message = encodeURIComponent(siteWhatsappFloat.whatsappText);

export function WhatsappFloat() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("inicio");
    if (!hero) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(!entry.isIntersecting),
      { threshold: 0.1 },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <a
      href={`https://wa.me/${siteBanner.whatsappNumber}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={siteWhatsappFloat.ariaLabel}
      className={cn(
        "fixed bottom-6 right-6 z-50 w-15 h-15 rounded-full bg-[#25D366] flex items-center justify-center shadow-lg transition-all duration-300",
        isVisible
          ? "opacity-100 pointer-events-auto hover:scale-110"
          : "opacity-0 pointer-events-none",
      )}
    >
      <FaWhatsapp size={34} color="white" className="translate-y-px" />
    </a>
  );
}
