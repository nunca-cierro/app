"use client";

import { useEffect, useState } from "react";

const messages = [
  {
    id: 1,
    type: "incoming" as const,
    text: "Hola, ¿a qué hora cierran hoy?",
    time: "2:15 PM",
  },
  {
    id: 2,
    type: "outgoing" as const,
    text: "¡Hola! 👋 Estamos abiertos hasta las 10 pm. ¿En qué más te puedo ayudar?",
    time: "2:15 PM",
  },
  {
    id: 3,
    type: "incoming" as const,
    text: "¿Tienen domicilios?",
    time: "2:16 PM",
  },
  {
    id: 4,
    type: "outgoing" as const,
    text: "Sí, hacemos domicilios en un radio de 2 km. Mínimo $15.000. ¿Quieres hacer un pedido? 🛒",
    time: "2:16 PM",
  },
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-2">
      <div className="flex gap-1 bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <span
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}

export function WhatsAppMockup() {
  const [visibleMessages, setVisibleMessages] = useState<number>(0);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    messages.forEach((_, index) => {
      timers.push(
        setTimeout(() => {
          setVisibleMessages(index + 1);
        }, 300 + index * 300)
      );
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative w-full max-w-[320px] mx-auto">
      {/* Phone frame */}
      <div className="relative rounded-[2.5rem] bg-gray-900 shadow-2xl shadow-black/50"
           style={{ padding: '3px' }}>
        {/* Screen */}
        <div className="relative rounded-[2.3rem] overflow-hidden bg-[#E5DDD5]">
          {/* Status bar — extends to full top with green */}
          <div className="bg-[#075E54] px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600">
                  DC
                </div>
                <div>
                  <p className="text-white text-sm font-medium leading-tight">
                    Tienda Don Carlos
                  </p>
                  <p className="text-white/70 text-[10px] leading-tight">
                    en línea
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </div>
          </div>

          {/* Chat background pattern */}
          <div className="px-3 py-4 min-h-[380px] relative">
            {/* WhatsApp chat wallpaper pattern */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />

            {/* Messages */}
            <div className="relative space-y-2">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === "outgoing" ? "justify-end" : "justify-start"}`}
                  style={{
                    opacity: index < visibleMessages ? 1 : 0,
                    transform:
                      index < visibleMessages
                        ? "translateY(0)"
                        : "translateY(16px)",
                    transition: "opacity 0.3s ease-out, transform 0.3s ease-out",
                  }}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-sm ${
                      message.type === "outgoing"
                        ? "bg-[#DCF8C6] rounded-br-sm"
                        : "bg-white rounded-bl-sm"
                    }`}
                  >
                    <p className="text-[13px] text-gray-800 leading-relaxed">
                      {message.text}
                    </p>
                    <div
                      className={`flex items-center gap-1 mt-0.5 ${
                        message.type === "outgoing"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <span className="text-[10px] text-gray-500">
                        {message.time}
                      </span>
                      {message.type === "outgoing" && (
                        <svg
                          className="w-3.5 h-3.5 text-[#53BDEB]"
                          viewBox="0 0 16 11"
                          fill="currentColor"
                        >
                          <path d="M11.071 0.653l-5.657 5.657-2.121-2.121-1.414 1.414 3.535 3.536 7.071-7.072z" />
                          <path d="M15.071 0.653l-5.657 5.657-1.414-1.414-1.414 1.414 2.828 2.829 7.071-7.072z" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {visibleMessages >= messages.length && (
                <div
                  style={{
                    opacity: visibleMessages >= messages.length ? 1 : 0,
                    transition: "opacity 0.3s ease-out 0.2s",
                  }}
                >
                  <TypingIndicator />
                </div>
              )}
            </div>
          </div>

          {/* Input bar */}
          <div className="bg-[#F0F0F0] px-3 py-2 flex items-center gap-2">
            <div className="flex-1 bg-white rounded-full px-4 py-2 flex items-center">
              <span className="text-gray-400 text-sm">Escribe un mensaje</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#075E54] flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Reduced motion support */}
      <style jsx>{`
        @media (prefers-reduced-motion: reduce) {
          .animate-bounce {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
