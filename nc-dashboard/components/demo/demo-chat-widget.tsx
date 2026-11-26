"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  Phone,
  CheckCheck,
  ShieldCheck,
} from "lucide-react";

export type DemoServiceItem = {
  title: string;
  description?: string;
  price?: string;
};

export type DemoFaqItem = {
  question: string;
  answer: string;
};

export type DemoBotReply = {
  reply: string;
  action?: {
    type: "whatsapp";
    label: string;
    url: string;
  };
};

interface DemoChatWidgetProps {
  businessName: string;
  categoryName: string;
  services: DemoServiceItem[];
  faqs?: DemoFaqItem[];
  whatsappNumber?: string;
  schedule?: string;
  address?: string;
  defaultOpen?: boolean;
  isOpenControlled?: boolean;
  onOpenChange?: (open: boolean) => void;
  welcomeMessageText?: string;
  quickQuestionsList?: string[];
  customReplyFn?: (userQuery: string) => DemoBotReply | null;
  queuedUserMessage?: string | null;
  onQueuedMessageConsumed?: () => void;
}

type ChatMessage = {
  id: string;
  sender: "bot" | "user";
  text: string;
  timestamp: string;
  action?: {
    type: "whatsapp";
    label: string;
    url: string;
  };
};

export function DemoChatWidget({
  businessName,
  categoryName,
  services,
  faqs = [],
  whatsappNumber = "573124932822",
  schedule = "Lunes a Sábado de 8:00 a.m. a 7:00 p.m.",
  address = "Sede Principal",
  defaultOpen = false,
  isOpenControlled,
  onOpenChange,
  welcomeMessageText,
  quickQuestionsList,
  customReplyFn,
  queuedUserMessage,
  onQueuedMessageConsumed,
}: DemoChatWidgetProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);

  const isControlled = typeof isOpenControlled === "boolean";
  const isOpen = isControlled ? isOpenControlled : internalOpen;

  const setIsOpen = (open: boolean) => {
    if (!isControlled) {
      setInternalOpen(open);
    }
    onOpenChange?.(open);
  };

  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageCounterRef = useRef(0);

  const cleanPhone = useMemo(
    () => whatsappNumber.replace(/[^0-9]/g, ""),
    [whatsappNumber]
  );

  const welcomeMessage: ChatMessage = useMemo(
    () => ({
      id: "msg-welcome",
      sender: "bot",
      text:
        welcomeMessageText ||
        `Hola, bienvenido a ${businessName}. Soy tu asistente virtual 24/7 impulsado por NuncaCierro. ¿En qué procedimiento o servicio estás interesado, o deseas conocer disponibilidad de citas y tarifas?`,
      timestamp: "Ahora",
    }),
    [businessName, welcomeMessageText]
  );

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const messages = useMemo(
    () => [welcomeMessage, ...chatMessages],
    [welcomeMessage, chatMessages]
  );

  const quickQuestions = useMemo(() => {
    if (quickQuestionsList && quickQuestionsList.length > 0) {
      return quickQuestionsList;
    }
    const list = [
      `¿Cuánto cuesta ${services[0]?.title || "el servicio"}?`,
      services[1] ? `¿Tienen ${services[1].title}?` : "¿Qué tratamientos ofrecen?",
      "¿Tienen citas de valoración?",
      "¿Qué horarios manejan?",
    ];
    return list;
  }, [services, quickQuestionsList]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  const generateBotReply = (
    userQuery: string
  ): { reply: string; action?: ChatMessage["action"] } => {
    if (customReplyFn) {
      const custom = customReplyFn(userQuery);
      if (custom) return custom;
    }

    const lower = userQuery.toLowerCase().trim();

    // 1. Coincidencia con servicio del catálogo
    const matchedService = services.find((s) =>
      lower.includes(s.title.toLowerCase())
    );

    if (matchedService) {
      return {
        reply: `Con respecto a ${matchedService.title}: ${
          matchedService.description || "es uno de nuestros procedimientos más solicitados"
        }. ${
          matchedService.price
            ? `La tarifa de referencia es desde ${matchedService.price}.`
            : "Contamos con facilidades de pago y evaluación médica previa."
        } ¿Te gustaría que reservemos tu cita de valoración para esta semana?`,
      };
    }

    // 2. Consulta de precios general
    if (
      lower.includes("precio") ||
      lower.includes("cuanto cuesta") ||
      lower.includes("cuánto cuesta") ||
      lower.includes("costo") ||
      lower.includes("tarifa") ||
      lower.includes("valor")
    ) {
      const sampleServices = services
        .slice(0, 3)
        .map((s) => s.title)
        .join(", ");
      return {
        reply: `En ${businessName} manejamos planes y tarifas personalizadas para tratamientos como ${sampleServices}. Para darte un presupuesto exacto según tu caso particular, te invitamos a una cita de valoración. ¿En qué día u horario te quedaría mejor asistir?`,
      };
    }

    // 3. Urgencias o dudas inmediatas
    if (
      lower.includes("urgencia") ||
      lower.includes("dolor") ||
      lower.includes("emergencia") ||
      lower.includes("inmediato")
    ) {
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `URGENCIA: Hola ${businessName}, requiero atención prioritaria hoy.`
      )}`;
      return {
        reply: `Atendemos consultas prioritarias de forma preferencial. Puedes confirmar tu caso de inmediato por WhatsApp para que el equipo médico te reciba con urgencia.`,
        action: {
          type: "whatsapp",
          label: "Contactar prioridad en WhatsApp",
          url: waUrl,
        },
      };
    }

    // 4. Agendamiento de citas / Turnos
    if (
      lower.includes("agendar") ||
      lower.includes("cita") ||
      lower.includes("hora") ||
      lower.includes("turno") ||
      lower.includes("disponible") ||
      lower.includes("reserva") ||
      lower.includes("valoracion") ||
      lower.includes("valoración")
    ) {
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `Hola ${businessName}, deseo confirmar una cita de valoración para esta semana.`
      )}`;
      return {
        reply: `Tenemos disponibilidad esta semana en nuestro horario de ${schedule}. Para registrar tu cupo, indícanos: 1. Tu nombre completo, 2. El tratamiento que deseas realizarte, y 3. El día u horario de tu preferencia. También puedes dejarlo confirmado directamente en WhatsApp.`,
        action: {
          type: "whatsapp",
          label: "Confirmar cita en WhatsApp real",
          url: waUrl,
        },
      };
    }

    // 5. Ubicación y horarios
    if (
      lower.includes("donde") ||
      lower.includes("dónde") ||
      lower.includes("direccion") ||
      lower.includes("dirección") ||
      lower.includes("ubicacion") ||
      lower.includes("ubicación") ||
      lower.includes("horario")
    ) {
      return {
        reply: `Nuestra sede se encuentra ubicada en ${address}. Atendemos de ${schedule}. ¿Deseas reservar tu turno para hoy o requieres indicaciones para llegar?`,
      };
    }

    // 6. FAQs registradas
    const matchedFaq = faqs.find((f) =>
      lower.includes(f.question.toLowerCase().slice(0, 15))
    );
    if (matchedFaq) {
      return { reply: matchedFaq.answer };
    }

    // 7. Captura de lead (número o nombre ingresado)
    if (
      /\d{7,12}/.test(lower) ||
      lower.includes("mi nombre es") ||
      lower.includes("me llamo")
    ) {
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `Hola ${businessName}, solicité información a través del asistente virtual: "${userQuery}"`
      )}`;
      return {
        reply: `Excelente, hemos registrado tus datos para que un especialista de ${businessName} te contacte a la brevedad y coordine tu espacio en agenda.`,
        action: {
          type: "whatsapp",
          label: "Finalizar contacto en WhatsApp",
          url: waUrl,
        },
      };
    }

    // Respuesta por defecto adaptada a la especialidad
    return {
      reply: `En ${businessName} somos especialistas en ${categoryName}. Atendemos valoraciones personalizadas y procedimientos avanzados. ¿Deseas agendar tu cita de valoración o tienes alguna duda específica sobre nuestros tratamientos?`,
    };
  };

  const handleSendRef = useRef<(textToSend?: string) => void>(() => {});

  const handleSend = (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim();
    if (!text || isTyping) return;

    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    messageCounterRef.current += 1;
    const userMsg: ChatMessage = {
      id: `usr-${messageCounterRef.current}`,
      sender: "user",
      text,
      timestamp: timeString,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    // Simulación de delay de IA pensando (650ms - 800ms)
    setTimeout(() => {
      const { reply, action } = generateBotReply(text);
      messageCounterRef.current += 1;
      const botMsg: ChatMessage = {
        id: `bot-${messageCounterRef.current}`,
        sender: "bot",
        text: reply,
        timestamp: timeString,
        action,
      };
      setChatMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 700);
  };

  useEffect(() => {
    handleSendRef.current = handleSend;
  });

  useEffect(() => {
    if (!isOpen || !queuedUserMessage) return;
    const timer = setTimeout(() => {
      handleSendRef.current(queuedUserMessage);
      onQueuedMessageConsumed?.();
    }, 180);
    return () => clearTimeout(timer);
  }, [isOpen, queuedUserMessage, onQueuedMessageConsumed]);

  return (
    <>
      {/* Botón flotante simulador estilo WhatsApp */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full bg-[#25D366] px-5 py-3.5 text-sm font-semibold text-white shadow-xl shadow-emerald-600/30 transition-all duration-200 hover:bg-[#20ba5a] hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-emerald-300"
          aria-label="Abrir simulador de WhatsApp"
        >
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-white"></span>
          </span>
          <MessageCircle className="h-5 w-5" />
          <span className="font-medium tracking-wide">Probar WhatsApp 24/7</span>
        </button>
      )}

      {/* Ventana de Chat con UI auténtica de WhatsApp */}
      {isOpen && (
        <div className="fixed inset-x-3 bottom-3 z-50 flex flex-col overflow-hidden rounded-2xl border border-zinc-300/80 bg-[#EFEAE2] shadow-2xl sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[620px] sm:w-[410px]">
          {/* Cabecera WhatsApp Oficial */}
          <div className="flex items-center justify-between bg-[#075E54] px-4 py-3 text-white shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#128C7E] text-white font-bold text-sm shadow-inner ring-2 ring-white/20">
                {businessName.slice(0, 2).toUpperCase()}
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[#25D366] ring-2 ring-[#075E54]"></span>
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold leading-tight text-white">
                  {businessName}
                </h3>
                <p className="flex items-center gap-1.5 text-xs text-emerald-100">
                  <span>en línea</span>
                  <span className="text-emerald-300">&middot;</span>
                  <span className="text-[11px] text-emerald-200">Bot 24/7</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-emerald-100 transition hover:bg-white/10 hover:text-white"
              aria-label="Cerrar simulador"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Subheader Banner indicador de simulación */}
          <div className="flex items-center justify-between border-b border-amber-200/60 bg-[#FFF8E7] px-3.5 py-1.5 text-[11px] text-amber-900 shadow-2xs">
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              Simulador interactivo de WhatsApp
            </span>
            <span className="flex items-center gap-1 text-[10px] text-amber-700 font-semibold">
              <ShieldCheck className="h-3 w-3" /> Nunca Cierro
            </span>
          </div>

          {/* Mensaje de cifrado simulado */}
          <div className="mx-auto my-2 max-w-[85%] rounded-lg bg-[#FFEECD]/80 px-3 py-1.5 text-center text-[10.5px] leading-tight text-[#54656F] shadow-2xs">
            Los mensajes de este simulador demuestran cómo la IA responde al instante a tus clientes sin esperas.
          </div>

          {/* Área de mensajes con fondo de chat WhatsApp */}
          <div className="flex-1 space-y-3 overflow-y-auto px-3.5 py-2 text-sm">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`relative max-w-[84%] rounded-xl px-3.5 py-2 text-xs leading-relaxed shadow-xs ${
                    msg.sender === "user"
                      ? "rounded-tr-xs bg-[#DCF8C6] text-zinc-900"
                      : "rounded-tl-xs bg-white text-zinc-900"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-[13px]">{msg.text}</p>

                  <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-zinc-400">
                    <span>{msg.timestamp}</span>
                    {msg.sender === "user" && (
                      <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
                    )}
                  </div>

                  {/* Botón de acción opcional dentro del mensaje */}
                  {msg.action && msg.action.type === "whatsapp" && (
                    <a
                      href={msg.action.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#20ba5a]"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {msg.action.label}
                    </a>
                  )}
                </div>
              </div>
            ))}

            {/* Indicador de escritura animado */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-xl rounded-tl-xs bg-white px-3.5 py-2 shadow-xs text-xs text-zinc-500">
                  <span className="text-[11px] font-medium text-emerald-800">Escribiendo</span>
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-600"></span>
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-600 [animation-delay:0.2s]"></span>
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-600 [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chips de preguntas sugeridas */}
          <div className="border-t border-zinc-200/60 bg-[#F0F2F5] px-3 py-2">
            <p className="mb-1 text-[10.5px] font-medium text-zinc-500">
              Prueba tocando una pregunta:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  disabled={isTyping}
                  className="rounded-full border border-zinc-300/80 bg-white px-2.5 py-1 text-left text-[11px] font-medium text-zinc-700 shadow-2xs transition hover:border-[#25D366] hover:bg-[#DCF8C6]/40 hover:text-emerald-900 disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Barra de entrada de texto estilo WhatsApp */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 border-t border-zinc-200 bg-[#F0F2F5] px-3 py-2.5"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Escribe un mensaje como cliente..."
              disabled={isTyping}
              className="flex-1 rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-[#128C7E] focus:ring-1 focus:ring-[#128C7E]"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#128C7E] text-white shadow-sm transition hover:bg-[#075E54] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Enviar mensaje"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
