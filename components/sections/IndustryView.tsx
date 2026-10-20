import Link from "next/link";
import { serviceHref } from "@/lib/catalog";
import type { Industry } from "@/lib/schema";
import { Container } from "@/components/hub/Container";
import { Dot } from "@/components/hub/Dot";
import { HubFooter } from "@/components/hub/HubFooter";
import { HubHeader } from "@/components/hub/HubHeader";
import { StatusPill } from "@/components/hub/StatusPill";

export function IndustryView({ industry }: { industry: Industry }) {
  return (
    <>
      <HubHeader back={{ href: "/", label: "All businesses" }} />
      <main className="flex-1">
        <Container className="pt-8 pb-16 sm:pt-14 sm:pb-24">
          <p className="flex items-center gap-2 text-sm font-semibold tracking-wide text-brand uppercase">
            <Dot />
            {industry.name}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink sm:text-6xl">
            What we build for {industry.plural}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted sm:text-xl">{industry.pitch}</p>

          <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3" aria-label={`${industry.name} services`}>
            {industry.services.map((service, i) => (
              <li key={service.slug}>
                <Link
                  href={serviceHref(industry, service)}
                  className="group flex h-full flex-col rounded-card bg-surface p-7 shadow-sm ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-md hover:ring-brand"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-muted tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    <StatusPill status={service.status} />
                  </span>
                  <h2 className="mt-6 text-2xl font-bold tracking-tight text-ink">{service.name}</h2>
                  <p className="mt-3 text-muted">{service.summary}</p>
                  <span className="mt-auto flex items-center gap-2 pt-8 text-sm font-semibold text-brand">
                    {service.status === "live" ? "Open live demo" : "See preview"}
                    <span aria-hidden className="transition group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </Container>
      </main>
      <HubFooter />
    </>
  );
}
