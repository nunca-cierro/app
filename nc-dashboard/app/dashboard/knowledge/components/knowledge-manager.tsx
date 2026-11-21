"use client";

import { useState } from "react";
import { useKnowledge } from "@/hooks/use-knowledge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  FileUp,
  FileText,
  CheckCircle2,
  Trash2,
  Loader2,
  Sparkles,
  BookOpen,
  AlertCircle,
  ExternalLink,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";

type IngestionSource = "url" | "file" | "manual";

interface KnowledgeManagerProps {
  tenantId?: string;
}

export function KnowledgeManager({ tenantId }: KnowledgeManagerProps = {}) {
  const {
    documents,
    isLoading,
    error,
    extractUrl,
    extractFile,
    saveDocument,
    updateDocument,
    resyncDocument,
    deleteDocument,
  } = useKnowledge(tenantId);

  const [sourceType, setSourceType] = useState<IngestionSource>("url");
  const [urlInput, setUrlInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resyncingId, setResyncingId] = useState<string | null>(null);

  // Review / Editor State (Human-in-the-loop)
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewMarkdown, setPreviewMarkdown] = useState("");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  const handleExtractUrl = async () => {
    if (!urlInput.trim()) {
      toast.error("Ingresa una URL válida.");
      return;
    }
    setIsExtracting(true);
    try {
      const res = await extractUrl(urlInput.trim());
      setPreviewTitle(res.title || "Contenido Web");
      setPreviewMarkdown(res.markdown);
      setSourceUrl(res.source);
      setEditingDocId(null);
      setIsPreviewing(true);
      toast.success("Contenido extraído con éxito. Revisa antes de indexar.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Error al extraer la URL");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleExtractFile = async () => {
    if (!selectedFile) {
      toast.error("Selecciona un archivo PDF, TXT o MD.");
      return;
    }
    setIsExtracting(true);
    try {
      const res = await extractFile(selectedFile);
      setPreviewTitle(res.title || selectedFile.name);
      setPreviewMarkdown(res.markdown);
      setSourceUrl(null);
      setEditingDocId(null);
      setIsPreviewing(true);
      toast.success("Archivo procesado con éxito. Revisa antes de indexar.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Error al procesar el archivo");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleStartManual = () => {
    setPreviewTitle("Información del Negocio");
    setPreviewMarkdown("# Título Principal\n\n## Servicios y Precios\n- Servicio 1: $00.000\n\n## Políticas\nDetalles...");
    setSourceUrl(null);
    setEditingDocId(null);
    setIsPreviewing(true);
  };

  const handleEdit = (doc: {
    id: string;
    title: string;
    source_type: string;
    source_url: string | null;
    raw_markdown?: string;
  }) => {
    setPreviewTitle(doc.title);
    setPreviewMarkdown(doc.raw_markdown || `# ${doc.title}\n\n`);
    setSourceUrl(doc.source_url);
    setSourceType(doc.source_type as IngestionSource);
    setEditingDocId(doc.id);
    setIsPreviewing(true);
  };

  const handleResync = async (doc: { id: string; title: string }) => {
    setResyncingId(doc.id);
    try {
      const res = await resyncDocument(doc.id);
      setPreviewTitle(res.title || doc.title);
      setPreviewMarkdown(res.markdown);
      setSourceUrl(res.source);
      setEditingDocId(doc.id);
      setIsPreviewing(true);
      toast.success("Contenido fresco obtenido de la web. Revisa y aprueba para actualizar.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Error al re-sincronizar");
    } finally {
      setResyncingId(null);
    }
  };

  const handleSaveDocument = async () => {
    if (!previewTitle.trim() || !previewMarkdown.trim()) {
      toast.error("El título y el contenido no pueden estar vacíos.");
      return;
    }
    setIsSaving(true);
    try {
      if (editingDocId) {
        await updateDocument(editingDocId, {
          title: previewTitle.trim(),
          raw_markdown: previewMarkdown.trim(),
        });
      } else {
        await saveDocument({
          title: previewTitle.trim(),
          source_type: sourceType,
          raw_markdown: previewMarkdown.trim(),
          source_url: sourceUrl,
        });
      }
      setIsPreviewing(false);
      setEditingDocId(null);
      setUrlInput("");
      setSelectedFile(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Error al guardar el documento");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteDocument(id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header informativo ── */}
      <div className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <BookOpen className="size-5 text-primary" />
          Base de Conocimiento y Documentos
        </h2>
        <p className="text-sm text-muted-foreground">
          Alimenta a tu asistente con páginas web, archivos PDF o notas en Markdown. Toda la información es limpiada, estructurada e indexada semánticamente en fragmentos de alta precisión para reducir el consumo de tokens y evitar alucinaciones.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* ── Panel de Ingesta o Editor de Previsualización ── */}
      {isPreviewing ? (
        <Card className="border-primary/20 shadow-xs">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Revisión antes de Indexar (Human-in-the-Loop)
                </CardTitle>
                <CardDescription>
                  Revisa y ajusta el contenido en Markdown. Puedes corregir precios, eliminar párrafos innecesarios y estructurar encabezados (# y ##).
                </CardDescription>
              </div>
              <Badge variant="outline" className="flex items-center gap-1">
                <Sparkles className="size-3 text-primary" />
                {sourceType.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Título del Documento
              </label>
              <Input
                value={previewTitle}
                onChange={(e) => setPreviewTitle(e.target.value)}
                placeholder="Ej. Catálogo de Servicios Médicos 2026"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">
                  Contenido en Markdown Estructurado
                </label>
                <span className="text-xs text-muted-foreground">
                  {previewMarkdown.length} caracteres
                </span>
              </div>
              <Textarea
                rows={12}
                value={previewMarkdown}
                onChange={(e) => setPreviewMarkdown(e.target.value)}
                className="font-mono text-xs leading-relaxed"
                placeholder="# Encabezado principal..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPreviewing(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveDocument}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Indexando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 size-4" />
                    Aprobar e Indexar
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Agregar Nueva Fuente de Conocimiento
            </CardTitle>
            <CardDescription>
              Selecciona el método de entrada para procesar la información del negocio.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selector de pestañas de origen */}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={sourceType === "url" ? "default" : "outline"}
                size="sm"
                onClick={() => setSourceType("url")}
              >
                <Globe className="mr-1.5 size-4" />
                Desde Sitio Web (URL)
              </Button>
              <Button
                type="button"
                variant={sourceType === "file" ? "default" : "outline"}
                size="sm"
                onClick={() => setSourceType("file")}
              >
                <FileUp className="mr-1.5 size-4" />
                Desde Archivo (PDF/TXT)
              </Button>
              <Button
                type="button"
                variant={sourceType === "manual" ? "default" : "outline"}
                size="sm"
                onClick={() => setSourceType("manual")}
              >
                <FileText className="mr-1.5 size-4" />
                Redacción Directa
              </Button>
            </div>

            {/* Opciones según la fuente */}
            {sourceType === "url" && (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  type="url"
                  placeholder="https://empresa.com/servicios"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="grow"
                />
                <Button
                  onClick={handleExtractUrl}
                  disabled={isExtracting || !urlInput.trim()}
                  className="shrink-0"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Extrayendo...
                    </>
                  ) : (
                    "Extraer y Revisar"
                  )}
                </Button>
              </div>
            )}

            {sourceType === "file" && (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  type="file"
                  accept=".pdf,.txt,.md,.markdown"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="grow"
                />
                <Button
                  onClick={handleExtractFile}
                  disabled={isExtracting || !selectedFile}
                  className="shrink-0"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    "Procesar y Revisar"
                  )}
                </Button>
              </div>
            )}

            {sourceType === "manual" && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Crea o pega notas, preguntas frecuentes específicas o reglamentos de forma manual.
                </p>
                <Button onClick={handleStartManual} size="sm">
                  Abrir Editor en Blanco
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Documentos Indexados ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Documentos Indexados ({documents.length})
              </CardTitle>
              <CardDescription>
                Información actualmente activa que el asistente consulta de manera dinámica en cada conversación.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : documents.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <BookOpen className="mx-auto mb-2 size-8 text-muted-foreground/40" />
              <p className="font-medium">Sin documentos indexados</p>
              <p className="mt-0.5 text-xs text-muted-foreground/80">
                Agrega una página web o un archivo arriba para que tu bot empiece a responder con información detallada.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-lg border">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{doc.title}</p>
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {doc.source_type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        Indexado: {new Date(doc.created_at).toLocaleDateString("es-CO", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      {doc.source_url && (
                        <a
                          href={doc.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          <ExternalLink className="size-3" />
                          Fuente
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 self-end sm:self-auto">
                    {doc.source_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={resyncingId === doc.id}
                        onClick={() => handleResync(doc)}
                        title="Re-sincronizar desde la web"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {resyncingId === doc.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <RefreshCw className="size-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(doc)}
                      title="Editar contenido"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deletingId === doc.id}
                      onClick={() => handleDelete(doc.id)}
                      title="Eliminar documento"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      {deletingId === doc.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
