import { KnowledgeManager } from "./components/knowledge-manager";

export const metadata = {
  title: "Base de Conocimiento | Nunca Cierro",
  description: "Ingesta y gestión de documentos y fuentes web para tu asistente.",
};

export default function KnowledgePage() {
  return (
    <div className="space-y-6">
      <KnowledgeManager />
    </div>
  );
}
