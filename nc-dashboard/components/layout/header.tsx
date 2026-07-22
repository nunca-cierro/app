"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { headerData, siteWhatsAppMessages } from "@/data/site";
import { cn } from "@/lib/utils";

const automationNav = [
  { name: "Planes", href: "/whatsapp#planes" },
  { name: "Contacto", href: "/whatsapp#contacto" },
];

const landingNav = [
  { name: "Precios", href: "/inicio#precios" },
  { name: "Contacto", href: "/inicio#contacto" },
];

export function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { brand, mobileMenu } = headerData;

  const isLanding = pathname === "/" || pathname === "/inicio" || pathname === "/pagina-web";
  const navItems = isLanding ? landingNav : automationNav;
  const whatsappUrl = isLanding ? siteWhatsAppMessages.landingUrl : siteWhatsAppMessages.automationUrl;

  // Smooth scroll handler
  const handleSmoothScroll = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (href.includes("#")) {
      const hash = href.split("#")[1];
      if (hash) {
        e.preventDefault();
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          const header = document.querySelector("header");
          const headerHeight = header?.offsetHeight || 80;
          let yOffset = -(headerHeight + 24);
          const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      }
    }
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-4 lg:px-6 pt-4 transition-all duration-300">
      <div
        className={cn(
          "mx-auto max-w-7xl rounded-2xl transition-all duration-300",
          isScrolled
            ? "border border-white/15 bg-[rgba(15,15,15,0.55)] shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl backdrop-saturate-150"
            : "border border-transparent bg-transparent shadow-none",
        )}
        style={
          isScrolled
            ? {
                WebkitBackdropFilter: "blur(18px) saturate(150%)",
                backdropFilter: "blur(18px) saturate(150%)",
              }
            : undefined
        }
      >
        <div className="grid grid-cols-3 items-center h-20 px-4 sm:px-6">
          <a
            href={isLanding ? "/inicio" : "/whatsapp"}
            className="flex items-center gap-2 px-3 py-1 shrink-0 justify-self-start group"
            style={{ letterSpacing: "0.01em" }}
          >
            <span
              className="text-[1.55rem] font-semibold"
              style={{ letterSpacing: "-0.4px" }}
            >
              <span className="text-white">{brand.name}</span>
              <span className="text-amber-400 transition-all duration-300 group-hover:drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">{brand.accent}</span>
            </span>
          </a>

          {/* Segmented Control - Centrado */}
          <div className="hidden md:flex justify-center">
            <div className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 p-0.5">
              <a
                href="/inicio"
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 no-underline",
                  isLanding
                    ? "bg-amber-500 text-stone-950 shadow-sm"
                    : "text-white/70 hover:text-white",
                )}
              >
                Sitio web
              </a>
              <a
                href="/whatsapp"
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 no-underline",
                  !isLanding
                    ? "bg-amber-500 text-stone-950 shadow-sm"
                    : "text-white/70 hover:text-white",
                )}
              >
                WhatsApp
              </a>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4 justify-self-end">

            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-[0.95rem] text-white/80 hover:text-white transition-colors px-2 py-1"
                style={{ letterSpacing: "0.06em" }}
                onClick={(e) => handleSmoothScroll(e, item.href)}
              >
                {item.name}
              </a>
            ))}

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-[0.9rem] font-medium text-white/90 transition-all hover:bg-white/20 hover:border-white/40 hover:shadow-[0_0_24px_rgba(255,255,255,0.12)] hover:-translate-y-0.5 shrink-0 backdrop-blur-sm"
              style={{ letterSpacing: "0.01em" }}
            >
              <svg className="w-4 h-4 text-[#25D366] transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Escríbenos
            </a>
          </nav>

          {/* Mobile Actions */}
          <div className="flex items-center gap-2 md:hidden">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white px-3 py-1.5 text-xs font-semibold text-stone-950 transition-all shrink-0"
            >
              <svg className="w-3.5 h-3.5 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Escríbenos
            </a>
            <button
              type="button"
              className="p-2 text-white rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={
                isMenuOpen ? mobileMenu.closeLabel : mobileMenu.openLabel
              }
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <span suppressHydrationWarning>
                  <Menu className="h-5 w-5" />
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden mt-2 px-4 py-6 border-t border-white/10 bg-[rgba(15,15,15,0.85)] backdrop-blur-xl rounded-b-2xl shadow-lg">
            <div className="flex flex-col gap-3">
              {/* Mobile segmented control */}
              <div className="flex items-center rounded-lg border border-white/15 bg-white/5 p-0.5 mb-2">
                <a
                  href="/inicio"
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 text-center no-underline",
                    isLanding
                      ? "bg-amber-500 text-stone-950 shadow-sm"
                      : "text-white/70 hover:text-white",
                  )}
                >
                  Sitio web
                </a>
                <a
                  href="/whatsapp"
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 text-center no-underline",
                    !isLanding
                      ? "bg-amber-500 text-stone-950 shadow-sm"
                      : "text-white/70 hover:text-white",
                  )}
                >
                  WhatsApp
                </a>
              </div>

              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-[0.95rem] text-white/80 hover:text-white transition-colors px-4 py-2 rounded-xl border border-white/10 bg-white/5 no-underline"
                  onClick={(e) => {
                    handleSmoothScroll(e, item.href);
                    setIsMenuOpen(false);
                  }}
                >
                  {item.name}
                </a>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
