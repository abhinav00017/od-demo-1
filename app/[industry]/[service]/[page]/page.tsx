import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { demoPageParams, getDemoPage } from "@/lib/catalog";
import { LiveDemo, liveDemoTitle } from "@/demos/render";

/** Inner pages of live demos only, such as /clinic/website/book. Preview services have none. */
export function generateStaticParams() {
  return demoPageParams();
}

export async function generateMetadata({ params }: PageProps<"/[industry]/[service]/[page]">): Promise<Metadata> {
  const { industry, service, page } = await params;
  const found = getDemoPage(industry, service, page);
  return found ? { title: { absolute: liveDemoTitle(found.demo, found.page) } } : {};
}

// With Cache Components, params is read inside a Suspense child, never in the page function itself.
export default function DemoPage({ params }: PageProps<"/[industry]/[service]/[page]">) {
  return (
    <Suspense>
      <DemoRoute params={params} />
    </Suspense>
  );
}

async function DemoRoute({ params }: { params: Promise<{ industry: string; service: string; page: string }> }) {
  const { industry, service, page } = await params;
  const found = getDemoPage(industry, service, page);
  if (!found || found.service.status !== "live") notFound();
  return <LiveDemo industry={found.industry} service={found.service} page={found.page} />;
}
