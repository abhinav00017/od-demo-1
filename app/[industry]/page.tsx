import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getIndustry, industries } from "@/lib/catalog";
import { IndustryView } from "@/components/sections/IndustryView";

export function generateStaticParams() {
  return industries.map((i) => ({ industry: i.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[industry]">): Promise<Metadata> {
  const industry = getIndustry((await params).industry);
  return industry ? { title: `${industry.name} services`, description: industry.pitch } : {};
}

// With Cache Components, params is read inside a Suspense child, never in the page function itself.
export default function IndustryPage({ params }: PageProps<"/[industry]">) {
  return (
    <Suspense>
      <Industry params={params} />
    </Suspense>
  );
}

async function Industry({ params }: { params: Promise<{ industry: string }> }) {
  const industry = getIndustry((await params).industry);
  if (!industry) notFound();
  return <IndustryView industry={industry} />;
}
