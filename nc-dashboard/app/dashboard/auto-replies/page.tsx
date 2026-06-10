"use client";

import { useState, useCallback, useEffect } from "react";
import { useAutoReplies } from "@/hooks/use-auto-replies";
import { useTenants } from "@/hooks/use-tenants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { toast } from "sonner";
import type { AutoReply, AutoReplyCreate, AutoReplyUpdate } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Form state                                                         */
/* ------------------------------------------------------------------ */

const emptyForm: AutoReplyCreate = {
  tenant_id: "",
  keywords: [],
  match_type: "any",
  response_text: "",
  enabled: true,
  priority: 0,
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AutoRepliesPage() {
  const { autoReplies, isLoading, error, listByTenant, create, update, remove, toggle } =
    useAutoReplies();
  const { tenants, isLoading: loadingTenants } = useTenants();

  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [form, setForm] = useState<AutoReplyCreate>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* Load replies when tenant changes */
  const loadReplies = useCallback(
    async (tenantId: string) => {
      if (!tenantId) return;
      try {
        await listByTenant(tenantId);
      } catch {
        toast.error("Error al cargar las respuestas programadas");
      }
    },
    [listByTenant],
  );

  useEffect(() => {
    if (selectedTenantId) {
      loadReplies(selectedTenantId);
    }
  }, [selectedTenantId, loadReplies]);

  /* ── Handlers ── */

  const handleTenantChange = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    setEditingId(null);
    setForm({ ...emptyForm, tenant_id: tenantId });
  };

  const handleEdit = (reply: AutoReply) => {
    setEditingId(reply.id);
    setForm({
      tenant_id: reply.tenant_id,
      keywords: reply.keywords,
      match_type: reply.match_type,
      response_text: reply.response_text,
      enabled: reply.enabled,
      priority: reply.priority,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ ...emptyForm, tenant_id: selectedTenantId });
  };

  const handleSubmit = async () => {
    if (!form.tenant_id) {
      toast.error("Seleccioná un negocio primero");
      return;
    }
    if (form.keywords.length === 0 || !form.keywords[0]) {
      toast.error("Agregá al menos una palabra clave");
      return;
    }
    if (!form.response_text.trim()) {
      toast.error("El texto de respuesta es obligatorio");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        const payload: AutoReplyUpdate = {
          keywords: form.keywords,
          match_type: form.match_type,
          response_text: form.response_text,
          enabled: form.enabled,
          priority: form.priority,
        };
        await update(editingId, payload);
        toast.success("Respuesta actualizada");
      } else {
        await create(form);
        toast.success("Respuesta creada");
      }
      handleCancel();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Error al guardar la respuesta";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (reply: AutoReply) => {
    try {
      await toggle(reply.id);
      toast.success(reply.enabled ? "Respuesta desactivada" : "Respuesta activada");
    } catch {
      toast.error("Error al cambiar estado");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      toast.success("Respuesta eliminada");
    } catch {
      toast.error("Error al eliminar la respuesta");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Respuestas programadas</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Gestioná las respuestas automáticas por palabras clave para cada negocio.
        </p>
      </div>

      {/* ── Tenant selector ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Negocio</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTenants ? (
            <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Cargando negocios...
            </div>
          ) : (
            <select
              value={selectedTenantId}
              onChange={(e) => handleTenantChange(e.target.value)}
              className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Seleccioná un negocio</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.plan})
                </option>
              ))}
            </select>
          )}
        </CardContent>
      </Card>

      {!selectedTenantId ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Seleccioná un negocio para gestionar sus respuestas programadas.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Form ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {editingId ? "Editar respuesta" : "Nueva respuesta"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Palabras clave
                </label>
                <Input
                  placeholder="Ej: horario, abierto, cerró"
                  value={form.keywords.join(", ")}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      keywords: e.target.value
                        .split(",")
                        .map((k) => k.trim())
                        .filter(Boolean),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Separadas por coma. Se activan cuando el mensaje coincide con
                  alguna (modo &quot;cualquiera&quot;), todas (modo &quot;todas&quot;) o la frase exacta
                  (modo &quot;exacta&quot;).
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Tipo de coincidencia
                  </label>
                  <select
                    value={form.match_type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        match_type: e.target.value as "any" | "all" | "exact",
                      })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="any">Cualquiera</option>
                    <option value="all">Todas</option>
                    <option value="exact">Exacta</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Prioridad
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={form.priority}
                    onChange={(e) =>
                      setForm({ ...form, priority: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Texto de respuesta
                </label>
                <Textarea
                  placeholder="Escribí la respuesta automática..."
                  value={form.response_text}
                  onChange={(e) =>
                    setForm({ ...form, response_text: e.target.value })
                  }
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  size="sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Guardando...
                    </>
                  ) : editingId ? (
                    "Guardar cambios"
                  ) : (
                    <>
                      <Plus className="mr-2 size-4" />
                      Crear respuesta
                    </>
                  )}
                </Button>
                {editingId && (
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    Cancelar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── List ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Respuestas ({autoReplies.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : autoReplies.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No hay respuestas programadas para este negocio. Creá la primera
                  usando el formulario de arriba.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 pr-4 font-medium">Palabras clave</th>
                        <th className="pb-2 pr-4 font-medium">Tipo</th>
                        <th className="pb-2 pr-4 font-medium">Respuesta</th>
                        <th className="pb-2 pr-4 font-medium text-center">Prioridad</th>
                        <th className="pb-2 pr-4 font-medium text-center">Activa</th>
                        <th className="pb-2 font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {autoReplies.map((reply) => (
                        <tr key={reply.id} className="border-b last:border-0">
                          <td className="py-3 pr-4">
                            <div className="flex flex-wrap gap-1">
                              {reply.keywords.map((kw) => (
                                <Badge key={kw} variant="secondary" className="text-[10px]">
                                  {kw}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {reply.match_type === "any"
                              ? "Cualquiera"
                              : reply.match_type === "all"
                                ? "Todas"
                                : "Exacta"}
                          </td>
                          <td className="max-w-xs truncate py-3 pr-4">
                            {reply.response_text}
                          </td>
                          <td className="py-3 pr-4 text-center text-muted-foreground">
                            {reply.priority}
                          </td>
                          <td className="py-3 pr-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggle(reply)}
                              className={`relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors ${
                                reply.enabled
                                  ? "bg-primary"
                                  : "bg-muted-foreground/30"
                              }`}
                            >
                              <span
                                className={`inline-block size-3.5 rounded-full bg-white transition-transform ${
                                  reply.enabled ? "translate-x-[18px]" : "translate-x-[2px]"
                                }`}
                              />
                            </button>
                          </td>
                          <td className="py-3">
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(reply)}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(reply.id)}
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
