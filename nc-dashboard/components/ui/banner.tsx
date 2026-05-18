import React from "react";
import { FaWhatsapp } from "react-icons/fa";
import { siteBanner } from "@/data/site";

export const Banner: React.FC = () => {
  return (
    <>
      <style>{`
        @keyframes banner-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes banner-pulse-glow {
          0%, 100% { box-shadow: 0 0 8px rgba(251,191,36,0.15), 0 0 20px rgba(251,191,36,0.05); }
          50% { box-shadow: 0 0 16px rgba(251,191,36,0.25), 0 0 40px rgba(251,191,36,0.10); }
        }
        @keyframes banner-btn-glow {
          0%, 100% { box-shadow: 0 0 6px rgba(34,197,94,0.3), 0 0 12px rgba(34,197,94,0.1); }
          50% { box-shadow: 0 0 12px rgba(34,197,94,0.5), 0 0 24px rgba(34,197,94,0.2); }
        }
        @keyframes banner-live-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        @keyframes banner-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1px); }
        }
      `}</style>

      <div
        className="w-full z-30 fixed top-0 text-white py-2 px-4 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-5 border-b border-amber-400/15"
        style={{
          background:
            "linear-gradient(135deg, #292524, #44403c, #292524, #1c1917)",
          backgroundSize: "300% 300%",
          animation:
            "banner-shift 8s ease infinite, banner-pulse-glow 3s ease-in-out infinite, banner-float 4s ease-in-out infinite",
          boxShadow:
            "0 0 8px rgba(251,191,36,0.15), 0 0 20px rgba(251,191,36,0.05)",
        }}
      >
        {/* Live indicator */}
        <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-2.5 py-1">
          <span
            style={{
              display: "inline-block",
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "#22c55e",
              animation: "banner-live-pulse 1.5s ease-in-out infinite",
            }}
          />
          En linea
        </span>

        {/* Mensaje para móvil */}
        <span className="flex md:hidden items-center gap-2 font-bold text-sm tracking-wide w-full justify-center text-amber-100">
          {siteBanner.messageMobile}
        </span>

        {/* Mensaje para desktop */}
        <span className="hidden md:flex items-center gap-2 font-bold text-base tracking-wide text-amber-100">
          {siteBanner.message}
        </span>

        <a
          href={siteBanner.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-auto ml-0 md:ml-2 bg-green-500 hover:bg-green-600 text-white font-bold px-5 py-1.5 rounded-full text-xs md:text-sm flex items-center gap-2 justify-center mt-2 md:mt-0 transition-all duration-300 hover:scale-105 hover:brightness-110"
          style={{
            animation: "banner-btn-glow 2s ease-in-out infinite",
          }}
        >
          <FaWhatsapp className="w-4 h-4" />
          <span className="md:hidden">{siteBanner.buttonLabelMobile}</span>
          <span className="hidden md:inline">{siteBanner.buttonLabel}</span>
        </a>
      </div>
    </>
  );
};

export default Banner;
