import { siteContact } from "@/data/site";
import { Section } from "@/components/layout/section";
import { AnimatedWrapper } from "@/components/ui/animated-wrapper";
import { Mail, MessageCircle } from "lucide-react";
import {
  FaRegClock,
  FaRegBuilding,
  FaMapMarkerAlt,
  FaRegStar,
  FaRegCalendarCheck,
} from "react-icons/fa";

export function Contact() {
  const iconMap = {
    Mail,
    MessageCircle,
  };
  const checklistIconMap = {
    FaRegBuilding,
    FaMapMarkerAlt,
    FaRegStar,
    FaRegCalendarCheck,
  };

  return (
    <Section
      id={siteContact.sectionId}
      className="border-stone-800/80 bg-stone-950 text-stone-100"
    >
      <AnimatedWrapper direction="up" duration={0.6}>
      <div className="mx-auto max-w-3xl text-center">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-amber-300">
            {siteContact.label}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-stone-100 md:text-4xl">
            {siteContact.title}
          </h2>
          <p className="mt-4 text-stone-300/80 leading-relaxed">
            {siteContact.subtitle}
          </p>

          <div className="mt-10 flex flex-col md:flex-row md:items-start md:justify-center md:gap-10 text-left">
            {/* Contactos a la izquierda */}
            <div className="flex-1 space-y-6 md:pr-4 md:border-stone-800/60">
              {siteContact.contacts.map((contact) => {
                const IconComponent =
                  iconMap[contact.icon as keyof typeof iconMap];
                return (
                  <div key={contact.label} className="flex items-start gap-4">
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-amber-400/10 text-amber-300 border border-amber-400/20 shrink-0">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col justify-center">
                      <p className="font-medium text-stone-100">
                        {contact.label}
                      </p>
                      <a
                        href={contact.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-stone-300/80 hover:text-amber-300 transition-colors"
                      >
                        {contact.text}
                      </a>
                    </div>
                  </div>
                );
              })}
              {/* Respuesta rápida */}
              <div className="flex items-center gap-2 text-amber-300 text-sm font-medium mb-2">
                <FaRegClock className="w-5 h-5" />
                {siteContact.quickResponseText}
              </div>
              {/* Horario de atención */}
              <p className="text-sm text-center text-stone-400 pt-4 border-t border-stone-800/80">
                {siteContact.footerText}
              </p>
            </div>

            {/* Checklist a la derecha */}
            <div className="flex-1 mt-8 md:mt-0 md:max-w-md md:pl-8">
              <div className="bg-stone-900/80 rounded-lg p-4 border border-amber-400/10">
                <p className="font-semibold text-amber-300 mb-2 flex items-center gap-2">
                  <span className="text-lg">{siteContact.quoteChecklist.icon}</span>
                  {siteContact.quoteChecklist.title}
                </p>
                <ul className="space-y-3">
                  {siteContact.quoteChecklist.items.map((item) => {
                    const IconComponent =
                      checklistIconMap[
                        item.icon as keyof typeof checklistIconMap
                      ];

                    return (
                      <li
                        key={item.text}
                        className="flex items-center gap-2 text-stone-200/90"
                      >
                        <IconComponent className="w-5 h-5 text-amber-400" />
                        {item.text}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </div>
        {/* Frase de confianza */}
        <p className="text-sm text-amber-400 mt-10">
          {siteContact.confidenceText}
        </p>
      </div>
      </AnimatedWrapper>
    </Section>
  );
}
