"use client";

import { useState } from "react";
import { useAgentTemplates } from "@/hooks/use-agent-templates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ChefHat, Sparkles, Utensils, Bot } from "lucide-react";
import type { AgentTemplate } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Category → display mapping                                          */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  { value: "restaurante", label: "Restaurante", Icon: Utensils },
  { value: "panaderia", label: "Panadería", Icon: ChefHat },
  { value: "hamburgueseria", label: "Hamburguesería", Icon: Sparkles },
  { value: "nuncacierro", label: "NuncaCierro", Icon: Bot },
] as const;

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface TemplateSelectorProps {
  onSelect: (template: AgentTemplate | null) => void;
  selectedId: string | null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TemplateSelector({
  onSelect,
  selectedId,
}: TemplateSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { templates, isLoading } = useAgentTemplates(
    activeCategory ?? undefined,
  );

  const handleCategoryClick = (category: string) => {
    setActiveCategory((prev) => (prev === category ? null : category));
    onSelect(null); // reset template selection when switching category
  };

  const handleTemplateClick = (template: AgentTemplate) => {
    onSelect(template);
  };

  const handleCustom = () => {
    setActiveCategory(null);
    onSelect(null);
  };

  return (
    <div className="space-y-6">
      {/* ── Category selector ── */}
      <div>
        <h3 className="text-sm font-medium mb-3">
          ¿Qué tipo de negocio quieres configurar?
        </h3>
        <div className="grid gap-3 sm:grid-cols-4">
          {CATEGORIES.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleCategoryClick(value)}
              className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-all hover:border-primary hover:bg-accent/50 ${
                activeCategory === value
                  ? "border-primary bg-accent ring-1 ring-primary"
                  : "border-input"
              }`}
            >
              <Icon className="size-6 text-muted-foreground" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}

          {/* Personalizado */}
          <button
            type="button"
            onClick={handleCustom}
            className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-all hover:border-primary hover:bg-accent/50 ${
              activeCategory === null && selectedId === null
                ? "border-primary bg-accent ring-1 ring-primary"
                : "border-input"
            }`}
          >
            <span className="text-2xl">✏️</span>
            <span className="text-sm font-medium">Personalizado</span>
          </button>
        </div>
      </div>

      {/* ── Template list for selected category ── */}
      {activeCategory && (
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay plantillas disponibles para esta categoría.
            </p>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">
                Elegí una plantilla para empezar:
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all hover:border-primary ${
                      selectedId === template.id
                        ? "border-primary ring-1 ring-primary"
                        : ""
                    }`}
                    onClick={() => handleTemplateClick(template)}
                  >
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-semibold">
                        {template.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
