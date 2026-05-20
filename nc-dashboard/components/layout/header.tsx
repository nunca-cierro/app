"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { headerData } from "@/data/site";
import { cn } from "@/lib/utils";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [language, setLanguage] = useState<"EN" | "ES">("ES");
  const { brand, navItems, mobileMenu } = headerData;

  // Smooth scroll handler
  const handleSmoothScroll = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const el = document.querySelector(href);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        // Compensar el header fijo en móvil y desktop
        const header = document.querySelector("header");
        const headerHeight = header?.offsetHeight || 80;
        // Si es móvil, ajustar el offset
        let yOffset = -headerHeight;
        if (window.innerWidth < 768) {
          yOffset = -144; // Offset específico para mobile, menor
        }
        const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLanguageToggle = () => {
    setLanguage((prev) => (prev === "EN" ? "ES" : "EN"));
  };

  return (
    <header
      className="fixed top-4 left-0 right-0 z-50 px-3 sm:px-4 lg:px-6 transition-all duration-300"
    >
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
        <div className="flex items-center justify-between h-20 px-4 sm:px-6">
          <a
            href={brand.href}
            className="flex items-center gap-2 px-3 py-1"
            style={{ letterSpacing: "0.01em" }}
            onClick={(e) => handleSmoothScroll(e, brand.href)}
          >
            <span
              className="text-[1.55rem] font-semibold"
              style={{ letterSpacing: "-0.4px" }}
            >
              <span className="text-white">{brand.name}</span>
              <span className="text-[#F2BF27]">{brand.accent}</span>
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 ml-auto">
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

            <button
              type="button"
              onClick={handleLanguageToggle}
              className="inline-flex w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/80 transition-colors hover:bg-white/20"
              aria-label="Cambiar idioma"
            >
              {language}
            </button>

            <a
              href={headerData.button.href}
              className="rounded-full border border-white/70 bg-white px-6 py-2 text-[0.95rem] font-semibold text-stone-950 transition-all hover:shadow-[0_0_20px_rgba(242,191,39,0.35)] hover:-translate-y-0.5"
              style={{ letterSpacing: "0.01em" }}
              onClick={(e) => handleSmoothScroll(e, headerData.button.href)}
            >
              {headerData.button.label}
            </a>
          </nav>

          {/* Mobile Actions */}
          <div className="flex items-center gap-2 md:hidden">
            <a
              href={headerData.button.href}
              className="rounded-full border border-white/70 bg-white px-3 py-1.5 text-xs font-semibold text-stone-950 transition-all"
              onClick={(e) => handleSmoothScroll(e, headerData.button.href)}
            >
              {headerData.button.label}
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
            <div className="flex flex-col gap-4">
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-[0.95rem] text-white/80 hover:text-white transition-colors px-4 py-2 rounded-xl border border-white/10 bg-white/5"
                  onClick={(e) => {
                    handleSmoothScroll(e, item.href);
                    setIsMenuOpen(false);
                  }}
                >
                  {item.name}
                </a>
              ))}
              <button
                type="button"
                onClick={handleLanguageToggle}
                className="inline-flex w-12 items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/80"
                aria-label="Cambiar idioma"
              >
                {language}
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
