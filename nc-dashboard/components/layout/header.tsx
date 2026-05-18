"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { headerData } from "@/data/site";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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

  return (
    <header
      className="fixed top-20 sm:top-12 left-0 right-0 z-50 transition-all duration-300 bg-[rgba(28,25,23,0.85)] shadow-lg border-b border-[rgba(251,191,36,0.12)] backdrop-blur-xl backdrop-saturate-150"
      style={{
        WebkitBackdropFilter: "blur(16px) saturate(150%)",
        backdropFilter: "blur(16px) saturate(150%)",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <a
            href={brand.href}
            className="flex items-center gap-2 px-3 py-1"
            style={{ letterSpacing: "0.01em" }}
            onClick={(e) => handleSmoothScroll(e, brand.href)}
          >
            <span
              className="text-xl font-bold"
              style={{ letterSpacing: "-0.4px" }}
            >
              <span className="text-white">{brand.name}</span>
              <span className="text-amber-300 ">{brand.accent}</span>
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center w-full">
            <div className="flex flex-1 justify-center items-center gap-8">
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-sm text-stone-200/90 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-[rgba(56,189,248,0.12)]"
                  onClick={(e) => handleSmoothScroll(e, item.href)}
                >
                  {item.name}
                </a>
              ))}
            </div>
            {/* Botón Planes y Precios Desktop */}
            <div className="flex items-center justify-end">
              <a
                href={headerData.button.href}
                className="px-5 py-2 rounded-lg shadow-lg bg-linear-to-r from-amber-600 via-orange-500 to-rose-500 hover:from-amber-700 hover:via-orange-600 hover:to-rose-600 text-white font-bold text-sm transition-all animate-pulse"
                style={{
                  letterSpacing: "0.01em",
                  boxShadow: "0 0 16px 4px #d97706, 0 0 32px 8px #f97316",
                }}
                onClick={(e) => handleSmoothScroll(e, headerData.button.href)}
              >
                {headerData.button.label}
              </a>
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden p-2 text-stone-100 rounded-lg bg-[rgba(251,191,36,0.14)] hover:bg-[rgba(251,191,36,0.22)] transition-colors"
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

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden mt-2 px-4 py-6 border-t border-[rgba(251,191,36,0.12)] bg-[rgba(28,25,23,0.94)] backdrop-blur-xl rounded-b-2xl shadow-lg">
            <div className="flex flex-col gap-5">
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-sm text-stone-100 hover:text-white transition-colors px-4 py-2 rounded-xl border border-[rgba(251,191,36,0.14)] bg-[rgba(251,191,36,0.08)] backdrop-blur-md hover:bg-[rgba(251,191,36,0.18)] shadow-sm"
                  style={{
                    WebkitBackdropFilter: "blur(8px)",
                    backdropFilter: "blur(8px)",
                  }}
                  onClick={(e) => {
                    handleSmoothScroll(e, item.href);
                    setIsMenuOpen(false);
                  }}
                >
                  {item.name}
                </a>
              ))}
              {/* Botón Planes y Precios Mobile */}
              <a
                href={headerData.button.href}
                className="w-full mt-2 px-8 py-2 rounded-lg shadow-lg bg-linear-to-r from-amber-600 via-orange-500 to-rose-500 hover:from-amber-700 hover:via-orange-600 hover:to-rose-600 text-white font-bold text-base transition-all animate-pulse text-center"
                style={{
                  letterSpacing: "0.01em",
                  boxShadow: "0 0 16px 4px #d97706, 0 0 32px 8px #f97316",
                }}
                onClick={(e) => {
                  handleSmoothScroll(e, headerData.button.href);
                  setIsMenuOpen(false);
                }}
              >
                {headerData.button.label}
              </a>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
