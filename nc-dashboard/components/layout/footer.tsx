import Link from "next/link";
import { footerData } from "@/data/site";
import { ArrowUp } from "lucide-react";
import {
  FaWhatsapp,
  FaInstagram,
  FaFacebook,
  FaXTwitter,
} from "react-icons/fa6";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { brand, description, navItems, socialLinks, copyright } = footerData;
  const iconMap = {
    FaWhatsapp,
    FaInstagram,
    FaFacebook,
    FaXTwitter,
  };
  const hoverColorMap = {
    FaWhatsapp: "hover:text-amber-400",
    FaInstagram: "hover:text-amber-400",
    FaFacebook: "hover:text-amber-400",
    FaXTwitter: "hover:text-amber-400",
  };

  return (
    <footer className="relative py-12 border-t border-amber-400/10 bg-stone-950 text-stone-100 overflow-hidden">
      {/* Línea decorativa glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-linear-to-r from-transparent via-amber-400/60 to-transparent" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          {/* Brand + descripción */}
          <div className="max-w-xs">
            <Link
              href={brand.href}
              className="text-xl font-bold tracking-tight text-stone-100 bg-linear-to-r from-amber-400 to-orange-400 bg-clip-text"
            >
              {brand.name}
              <span className="text-amber-300">{brand.accent}</span>
            </Link>
            <p className="mt-3 text-sm text-stone-400 leading-relaxed">
              {description}
            </p>
            {/* Redes sociales */}
            <div className="flex gap-3 mt-5">
              {socialLinks.map((social) => {
                const IconComponent =
                  iconMap[social.icon as keyof typeof iconMap];
                const hoverColor =
                  hoverColorMap[social.icon as keyof typeof hoverColorMap];

                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg border border-stone-800 text-stone-400 ${hoverColor} transition-all duration-200 hover:border-amber-400/30 hover:bg-amber-400/10 text-base`}
                  >
                    <IconComponent />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Navegación */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/70 mb-4">
              Navegación
            </p>
            <nav className="flex flex-col gap-3">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-sm text-stone-400 hover:text-amber-300 transition-colors duration-200"
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Volver arriba */}
          <div className="flex flex-col items-start md:items-end gap-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/70 mb-1">
              Subir
            </p>
            <a
              href="#inicio"
              className="w-10 h-10 flex items-center justify-center rounded-full border border-stone-800 text-stone-400 hover:border-amber-400/40 hover:text-amber-300 hover:bg-amber-400/10 transition-all duration-200"
              aria-label="Volver arriba"
            >
              <ArrowUp className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-stone-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-stone-500">
            © {currentYear} {brand.name}. {copyright.label}
          </p>
        </div>
      </div>
    </footer>
  );
}
