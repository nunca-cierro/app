"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  Plus,
  Trash2,
  GripVertical,
} from "lucide-react";
import type { BusinessConfig } from "@/lib/types/agent";

/* ------------------------------------------------------------------ */
/*  Internal item types                                                 */
/* ------------------------------------------------------------------ */

type ProductItem = NonNullable<BusinessConfig["products_services"]>[number];
type FaqItem = NonNullable<BusinessConfig["faq"]>[number];

/* ------------------------------------------------------------------ */
/*  Form field class — matches existing dashboard styles                */
/* ------------------------------------------------------------------ */

const inputClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const textareaClass =
  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const labelClass = "text-sm font-medium";

/* ── Recommended defaults ─────────────────────────────────────────── */
const RECOMMENDED_INSTRUCTIONS =
  "Eres un asistente de atención al cliente.\n" +
  "- Responde SOLO con la información del negocio que se te proporciona.\n" +
  "- Si no sabes algo, no inventes — di que un asesor humano va a ayudar.\n" +
  "- Sé breve: responde lo justo y necesario, sin rodeos.\n" +
  "- Haz máximo UNA pregunta por mensaje.\n" +
  "- Si el cliente muestra interés en algo, menciónalo de forma natural.\n" +
  "  La venta debe sentirse como sugerencia, no como empuje.\n" +
  "- Saluda y ofrece ayuda cuando el cliente salude.";

/* ------------------------------------------------------------------ */
/*  Default config                                                     */
/* ------------------------------------------------------------------ */

function emptyConfig(): BusinessConfig {
  return {
    business_info: {},
    products_services: [],
    faq: [],
    tone: "amigable y profesional",
    keywords_to_escalate: [],
    fallback_message:
      "Un asesor humano te atenderá en breve. Por favor espera mientras te conectamos.",
  };
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface BusinessConfigFormProps {
  config: BusinessConfig | null;
  onSave: (config: BusinessConfig) => Promise<void>;
  isSaving: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BusinessConfigForm({
  config,
  onSave,
  isSaving,
}: BusinessConfigFormProps) {
  const [form, setForm] = useState<BusinessConfig>(
    config ?? emptyConfig(),
  );

  /* ── Helpers ─────────────────────────────────────────────────────── */

  const setBiz = (patch: Partial<BusinessConfig["business_info"]>) =>
    setForm((prev) => ({
      ...prev,
      business_info: { ...prev.business_info, ...patch },
    }));

  const setField = <K extends keyof BusinessConfig>(
    key: K,
    value: BusinessConfig[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  /* ── Products ────────────────────────────────────────────────────── */

  const addProduct = () =>
    setForm((prev) => ({
      ...prev,
      products_services: [
        ...(prev.products_services ?? []),
        { name: "", price: "" },
      ],
    }));

  const updProduct = (
    idx: number,
    patch: Partial<ProductItem>,
  ) =>
    setForm((prev) => {
      const items = [...(prev.products_services ?? [])];
      items[idx] = { ...items[idx], ...patch };
      return { ...prev, products_services: items };
    });

  const delProduct = (idx: number) =>
    setForm((prev) => ({
      ...prev,
      products_services: (prev.products_services ?? []).filter(
        (_, i) => i !== idx,
      ),
    }));

  /* ── FAQ ─────────────────────────────────────────────────────────── */

  const addFaq = () =>
    setForm((prev) => ({
      ...prev,
      faq: [...(prev.faq ?? []), { question: "", answer: "" }],
    }));

  const updFaq = (
    idx: number,
    patch: Partial<FaqItem>,
  ) =>
    setForm((prev) => {
      const items = [...(prev.faq ?? [])];
      items[idx] = { ...items[idx], ...patch };
      return { ...prev, faq: items };
    });

  const delFaq = (idx: number) =>
    setForm((prev) => ({
      ...prev,
      faq: (prev.faq ?? []).filter((_, i) => i !== idx),
    }));

  /* ── Keywords ────────────────────────────────────────────────────── */

  const keywordsText = (form.keywords_to_escalate ?? []).join(", ");
  const setKeywordsText = (val: string) =>
    setField(
      "keywords_to_escalate",
      val
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
    );

  /* ── Submit ──────────────────────────────────────────────────────── */

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* ── Instrucciones de comportamiento ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Instrucciones de comportamiento
            </CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  instructions: RECOMMENDED_INSTRUCTIONS,
                }))
              }
            >
              + Usar instrucciones recomendadas
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <textarea
            className={textareaClass}
            rows={6}
            value={form.instructions ?? ""}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, instructions: e.target.value }))
            }
            placeholder={`Describe cómo debe comportarse el bot al atender clientes. Ej:

- Sé amable, breve y directo. Usa emojis con moderación.
- Haz máximo UNA pregunta por mensaje.
- No inventes precios ni productos que no estén en la lista.
- Si el cliente se interesa, sugiérele el producto de forma natural, sin presionar.
- Si preguntan algo que no sabes, di: "Un asesor humano te atenderá en breve".
- Saluda al inicio y ofrece ayuda.`}
          />
          <p className="text-xs text-muted-foreground">
            Estas instrucciones se combinan con los datos del negocio para
            formar el prompt completo del bot. Reemplazan al system prompt
            tradicional.
          </p>
        </CardContent>
      </Card>

      {/* ── Información del Negocio ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Información del Negocio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className={labelClass}>Nombre del negocio</label>
            <Input
              value={form.business_info?.name ?? ""}
              onChange={(e) => setBiz({ name: e.target.value })}
              placeholder="Ej: Barbería El Pelao"
            />
          </div>
          <div className="space-y-2">
            <label className={labelClass}>Descripción</label>
            <textarea
              className={textareaClass}
              rows={2}
              value={form.business_info?.description ?? ""}
              onChange={(e) => setBiz({ description: e.target.value })}
              placeholder="¿A qué se dedica el negocio?"
            />
          </div>
          <div className="space-y-2">
            <label className={labelClass}>Horarios</label>
            <Input
              value={form.business_info?.schedule ?? ""}
              onChange={(e) => setBiz({ schedule: e.target.value })}
              placeholder="Ej: Lun–Vie 9:00–20:00, Sáb 9:00–18:00, Dom Cerrado"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className={labelClass}>Ubicación</label>
              <Input
                value={form.business_info?.location ?? ""}
                onChange={(e) => setBiz({ location: e.target.value })}
                placeholder="Ej: Calle 123 #45-67, Bogotá"
              />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>Teléfono</label>
              <Input
                value={form.business_info?.phone ?? ""}
                onChange={(e) => setBiz({ phone: e.target.value })}
                placeholder="Ej: +573001234567"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className={labelClass}>Sitio web</label>
              <Input
                value={form.business_info?.website ?? ""}
                onChange={(e) => setBiz({ website: e.target.value })}
                placeholder="Ej: https://barberia.com"
              />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>Redes sociales</label>
              <Input
                value={form.business_info?.social ?? ""}
                onChange={(e) => setBiz({ social: e.target.value })}
                placeholder="Ej: @barberia en Instagram"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Productos / Servicios ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Productos / Servicios
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addProduct}
          >
            <Plus className="mr-1 size-3" />
            Agregar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {(form.products_services ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Agregá los productos o servicios que ofrece el negocio.
            </p>
          )}
          {(form.products_services ?? []).map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 rounded-md border p-3"
            >
              <GripVertical className="mt-3 size-4 shrink-0 text-muted-foreground" />
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Nombre"
                  value={item.name}
                  onChange={(e) => updProduct(idx, { name: e.target.value })}
                />
                <Input
                  placeholder="Precio"
                  value={item.price}
                  onChange={(e) => updProduct(idx, { price: e.target.value })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-1 size-8 shrink-0 text-destructive"
                onClick={() => delProduct(idx)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Preguntas Frecuentes ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Preguntas Frecuentes
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addFaq}
          >
            <Plus className="mr-1 size-3" />
            Agregar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {(form.faq ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Agregá preguntas frecuentes y sus respuestas.
            </p>
          )}
          {(form.faq ?? []).map((item, idx) => (
            <div key={idx} className="space-y-2 rounded-md border p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Pregunta"
                    value={item.question}
                    onChange={(e) =>
                      updFaq(idx, { question: e.target.value })
                    }
                  />
                  <textarea
                    className={textareaClass}
                    rows={2}
                    placeholder="Respuesta"
                    value={item.answer}
                    onChange={(e) =>
                      updFaq(idx, { answer: e.target.value })
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-1 size-8 shrink-0 text-destructive"
                  onClick={() => delFaq(idx)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Tono ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Tono de Respuesta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <select
            className={inputClass}
            value={form.tone ?? "amigable y profesional"}
            onChange={(e) => setField("tone", e.target.value)}
          >
            <option value="amigable y profesional">Amigable y profesional</option>
            <option value="formal">Formal</option>
            <option value="casual y cercano">Casual y cercano</option>
            <option value="ejecutivo">Ejecutivo</option>
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Define cómo debe sonar el bot al responder.
          </p>
        </CardContent>
      </Card>

      {/* ── Palabras clave para derivar ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Derivación a Humano
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <label className={labelClass}>
              Palabras clave que activan derivación
            </label>
            <Input
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              placeholder="Ej: gerente, reclamo, queja, devolución, cancelar"
            />
            <p className="text-xs text-muted-foreground">
              Separadas por coma. Si el cliente menciona alguna, el bot deriva
              a un humano.
            </p>
          </div>
          <div className="space-y-2">
            <label className={labelClass}>
              Mensaje cuando no puede responder
            </label>
            <textarea
              className={textareaClass}
              rows={2}
              value={form.fallback_message ?? ""}
              onChange={(e) => setField("fallback_message", e.target.value)}
              placeholder="Un asesor humano te atenderá en breve."
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Submit ── */}
      <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
        {isSaving ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Guardando...
          </>
        ) : (
          "Guardar Configuración del Negocio"
        )}
      </Button>
    </form>
  );
}
