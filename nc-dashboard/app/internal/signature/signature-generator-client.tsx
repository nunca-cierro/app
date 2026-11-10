"use client";

import { useState, useMemo, useRef } from "react";
import {
  Copy,
  Check,
  Mail,
  Phone,
  Building2,
  User,
  Briefcase,
  Sparkles,
  Code2,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";

export interface SignatureData {
  fullName: string;
  role: string;
  email: string;
  phone: string;
  avatarUrl: string;
  showTagline: boolean;
  tagline: string;
}

const DEFAULT_SIGNATURE: SignatureData = {
  fullName: "Nicolás Valenzuela",
  role: "Fundador & Lead Engineer",
  email: "nicolas@nuncacierro.com",
  phone: "+57 312 4932822",
  avatarUrl: "https://nuncacierro.com/logo.jpeg",
  showTagline: true,
  tagline: "Automatización de WhatsApp 24/7 para empresas y comercios.",
};

export function SignatureGeneratorClient() {
  const [data, setData] = useState<SignatureData>(DEFAULT_SIGNATURE);
  const [copiedRich, setCopiedRich] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const cleanPhone = useMemo(
    () => data.phone.replace(/[^0-9]/g, ""),
    [data.phone],
  );

  const rawHtmlSignature = useMemo(() => {
    const avatar = data.avatarUrl.trim() || "https://nuncacierro.com/logo.jpeg";
    const waLink = `https://wa.me/${cleanPhone}`;
    const taglineRow = data.showTagline
      ? `
        <tr>
          <td colspan="2" style="padding-top: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; color: #78716c; line-height: 15px; border-top: 1px dashed #e7e5e4;">
            <strong style="color: #b45309;">NuncaCierro</strong> &middot; ${data.tagline}
          </td>
        </tr>`
      : "";

    return `<table cellpadding="0" cellspacing="0" border="0" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #292524; background-color: transparent; border-collapse: collapse; line-height: 1.4; text-align: left;">
  <tr>
    <td valign="top" style="padding-right: 16px; border-right: 2px solid #d97706; vertical-align: top; width: 72px;">
      <img src="${avatar}" alt="${data.fullName}" width="68" height="68" style="display: block; width: 68px; height: 68px; border-radius: 12px; object-fit: cover; border: 1px solid #e7e5e4;" />
    </td>
    <td valign="top" style="padding-left: 16px; vertical-align: top;">
      <div style="font-size: 16px; font-weight: 700; color: #1c1917; margin: 0 0 2px 0;">${data.fullName}</div>
      <div style="font-size: 12px; font-weight: 600; color: #b45309; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px 0;">${data.role}</div>
      <table cellpadding="0" cellspacing="0" border="0" style="font-size: 12px; color: #57534e;">
        <tr>
          <td style="padding: 1px 0;">
            <span style="color: #78716c;">Correo:</span> <a href="mailto:${data.email}" style="color: #44403c; text-decoration: none; font-weight: 500;">${data.email}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 1px 0;">
            <span style="color: #78716c;">WhatsApp:</span> <a href="${waLink}" style="color: #b45309; text-decoration: none; font-weight: 600;">${data.phone}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 1px 0;">
            <span style="color: #78716c;">Sitio web:</span> <a href="https://nuncacierro.com" style="color: #44403c; text-decoration: none; font-weight: 500;">nuncacierro.com</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>${taglineRow}
</table>`.trim();
  }, [data, cleanPhone]);

  const copyRichToClipboard = async () => {
    try {
      const blobHtml = new Blob([rawHtmlSignature], { type: "text/html" });
      const plainText = `${data.fullName}\n${data.role} | Nunca Cierro\nWhatsApp: ${data.phone}\nCorreo: ${data.email}\nhttps://nuncacierro.com`;
      const blobText = new Blob([plainText], { type: "text/plain" });

      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": blobHtml,
          "text/plain": blobText,
        }),
      ]);

      setCopiedRich(true);
      setTimeout(() => setCopiedRich(false), 2500);
    } catch {
      // Fallback simple si ClipboardItem no estuviera soportado
      if (previewRef.current) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(previewRef.current);
        selection?.removeAllRanges();
        selection?.addRange(range);
        document.execCommand("copy");
        selection?.removeAllRanges();
        setCopiedRich(true);
        setTimeout(() => setCopiedRich(false), 2500);
      }
    }
  };

  const copyHtmlCode = async () => {
    await navigator.clipboard.writeText(rawHtmlSignature);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2500);
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 transition-colors">
      {/* Top Header Barra Interna */}
      <header className="border-b border-stone-200 bg-stone-50/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-700 text-white shadow-sm">
              <Building2 className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-stone-900">
                  Nunca<span className="text-amber-700">Cierro</span>
                </span>
                <span className="rounded-full border border-stone-300 bg-stone-200/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-700">
                  Uso Interno
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Generador Oficial de Firmas de Correo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://nuncacierro.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-50"
            >
              <span>Ir al sitio público</span>
              <ExternalLink className="size-3 text-stone-400" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
            Generador de Firma para el Equipo
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Diseñado en la paleta corporativa cálida (ámbar y stone) con tablas HTML inline compatibles al 100% con Gmail, Outlook y Apple Mail.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Formulario (Columna Izquierda: 5 cols) */}
          <div className="space-y-6 lg:col-span-5">
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-amber-700">
                <User className="size-4" />
                Información del Colaborador
              </h2>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={data.fullName}
                    onChange={(e) =>
                      setData({ ...data, fullName: e.target.value })
                    }
                    placeholder="Ej. Camila Restrepo"
                    className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-amber-600 focus:bg-white focus:ring-1 focus:ring-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700">
                    Cargo o Rol
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      type="text"
                      value={data.role}
                      onChange={(e) =>
                        setData({ ...data, role: e.target.value })
                      }
                      placeholder="Ej. Growth & Operaciones"
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-amber-600 focus:bg-white focus:ring-1 focus:ring-amber-600"
                    />
                    <Briefcase className="pointer-events-none absolute right-3 top-3 size-4 text-stone-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700">
                    Correo institucional
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      type="email"
                      value={data.email}
                      onChange={(e) =>
                        setData({ ...data, email: e.target.value })
                      }
                      placeholder="nombre@nuncacierro.com"
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-amber-600 focus:bg-white focus:ring-1 focus:ring-amber-600"
                    />
                    <Mail className="pointer-events-none absolute right-3 top-3 size-4 text-stone-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700">
                    Teléfono / WhatsApp corporativo
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      type="tel"
                      value={data.phone}
                      onChange={(e) =>
                        setData({ ...data, phone: e.target.value })
                      }
                      placeholder="+57 312 4932822"
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-amber-600 focus:bg-white focus:ring-1 focus:ring-amber-600"
                    />
                    <Phone className="pointer-events-none absolute right-3 top-3 size-4 text-stone-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700">
                    URL Foto de perfil / Avatar
                  </label>
                  <input
                    type="url"
                    value={data.avatarUrl}
                    onChange={(e) =>
                      setData({ ...data, avatarUrl: e.target.value })
                    }
                    placeholder="https://... (dejar vacío para logo oficial)"
                    className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-600 outline-none transition focus:border-amber-600 focus:bg-white focus:ring-1 focus:ring-amber-600"
                  />
                  <p className="mt-1 text-[11px] text-stone-500">
                    Soporta cualquier enlace público (LinkedIn, Unsplash, GitHub o el logo de NuncaCierro).
                  </p>
                </div>
              </div>
            </div>

            {/* Opciones adicionales */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-amber-700">
                <Sparkles className="size-4" />
                Mensaje de Marca
              </h2>

              <div className="mt-4 space-y-3">
                <label className="flex items-center gap-2 text-xs font-medium text-stone-700">
                  <input
                    type="checkbox"
                    checked={data.showTagline}
                    onChange={(e) =>
                      setData({ ...data, showTagline: e.target.checked })
                    }
                    className="size-4 rounded border-stone-300 text-amber-700 focus:ring-amber-600"
                  />
                  Incluir lema comercial inferior
                </label>

                {data.showTagline && (
                  <textarea
                    rows={2}
                    value={data.tagline}
                    onChange={(e) =>
                      setData({ ...data, tagline: e.target.value })
                    }
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/50 p-3 text-xs outline-none transition focus:border-amber-600 focus:bg-white focus:ring-1 focus:ring-amber-600"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Vista Previa y Exportación (Columna Derecha: 7 cols) */}
          <div className="space-y-6 lg:col-span-7">
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-stone-900">
                    Vista Previa en Vivo
                  </h2>
                  <p className="text-xs text-stone-500">
                    Simulación exacta de cómo se visualizará en la bandeja de entrada
                  </p>
                </div>

                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                  <ShieldCheck className="size-3.5" />
                  <span>Compatibilidad HTML</span>
                </div>
              </div>

              {/* Contenedor simulador de correo (Estilo cliente Gmail) */}
              <div className="mt-6 rounded-xl border border-stone-200 bg-stone-50/50 p-6 md:p-8">
                <div className="mb-4 flex items-center justify-between border-b border-stone-200/80 pb-3 text-xs text-stone-500">
                  <span>Para: cliente@empresa.com</span>
                  <span>Asunto: Propuesta comercial</span>
                </div>

                <p className="mb-6 text-xs leading-relaxed text-stone-600">
                  Hola, muchas gracias por tu tiempo hoy. Adjunto la cotización de los servicios de automatización de WhatsApp. Quedo a tu disposición si tienes alguna duda.
                  <br />
                  <br />
                  Saludos cordiales,
                </p>

                {/* Área de Firma Renderizada */}
                <div
                  ref={previewRef}
                  className="rounded-lg bg-white p-4 shadow-2xs inline-block max-w-full overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: rawHtmlSignature }}
                />
              </div>

              {/* Botones de Acción */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={copyRichToClipboard}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800"
                >
                  {copiedRich ? (
                    <>
                      <Check className="size-4" />
                      <span>Copiado para Gmail</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      <span>Copiar firma para Gmail</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={copyHtmlCode}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
                >
                  {copiedHtml ? (
                    <>
                      <Check className="size-4" />
                      <span>Código copiado</span>
                    </>
                  ) : (
                    <>
                      <Code2 className="size-4 text-stone-500" />
                      <span>Copiar código HTML</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs text-stone-600">
                <p className="font-semibold text-stone-900">
                  ¿Cómo instalarla en Gmail?
                </p>
                <ol className="mt-1.5 list-decimal space-y-1 pl-4">
                  <li>Haz clic en <strong>Copiar firma para Gmail</strong>.</li>
                  <li>Ve a Gmail &rarr; Ajustes (engranaje) &rarr; <em>Ver todos los ajustes</em>.</li>
                  <li>Baja hasta la sección <strong>Firma</strong>, crea una nueva y pega con <code>Ctrl + V</code> (o <code>Cmd + V</code>).</li>
                  <li>Guarda los cambios al final de la página.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
