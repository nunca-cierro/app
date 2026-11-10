import type { Metadata } from "next";
import { getDemoProfileBySlug, getAllDemoSlugs } from "@/lib/demos-config";
import { DynamicDemoView } from "@/components/demo/dynamic-demo-view";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { profile } = await getDemoProfileBySlug(slug);

  return {
    title: `${profile.businessName} | Demo de Automatización NuncaCierro`,
    description: `Demostración interactiva de atención y agendamiento 24/7 para ${profile.businessName}. Impulsado por Nunca Cierro.`,
  };
}

/**
 * Escanea dinámicamente la carpeta lib/demos/ para pre-renderizar
 * todas las demostraciones existentes en tiempo de compilación.
 */
export function generateStaticParams() {
  const slugs = getAllDemoSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function DemoSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const { profile, isCustom } = await getDemoProfileBySlug(slug);

  return <DynamicDemoView profile={profile} isCustom={isCustom} />;
}
