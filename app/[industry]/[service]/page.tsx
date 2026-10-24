import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getService, serviceParams } from "@/lib/catalog";
import { ServicePreview } from "@/components/sections/ServicePreview";
import { LiveDemo, liveDemoDescription, liveDemoTitle } from "@/demos/render";

export function generateStaticParams() {
  return serviceParams();
}

export async function generateMetadata({ params }: PageProps<"/[industry]/[service]">): Promise<Metadata> {
  const { industry, service } = await params;
  const found = getService(industry, service);
  if (!found) return {};
  if (found.service.status === "live") {
    const description = liveDemoDescription(found.service.demo);
    return { title: { absolute: liveDemoTitle(found.service.demo, "") }, ...(description ? { description } : {}) };
  }
  return { title: `${found.service.name} for ${found.industry.plural}`, description: found.service.summary };
}

// With Cache Components, params is read inside a Suspense child, never in the page function itself.
export default function ServicePage({ params }: PageProps<"/[industry]/[service]">) {
  return (
    <Suspense>
      <ServiceRoute params={params} />
    </Suspense>
  );
}

async function ServiceRoute({ params }: { params: Promise<{ industry: string; service: string }> }) {
  const { industry: industrySlug, service: serviceSlug } = await params;
  const found = getService(industrySlug, serviceSlug);
  if (!found) notFound();
  const { industry, service } = found;
  if (service.status === "live") return <LiveDemo industry={industry} service={service} page="" />;
  return <ServicePreview industry={industry} service={service} />;
}
