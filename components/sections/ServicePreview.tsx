import Link from "next/link";
import { nextService, serviceHref } from "@/lib/catalog";
import type { Industry, PreviewService } from "@/lib/schema";
import { Container } from "@/components/hub/Container";
import { Dot } from "@/components/hub/Dot";
import { HubFooter } from "@/components/hub/HubFooter";
import { HubHeader } from "@/components/hub/HubHeader";
import { StatusPill } from "@/components/hub/StatusPill";
import { MockView } from "@/components/mocks/MockView";

export function ServicePreview({ industry, service }: { industry: Industry; service: PreviewService }) {
  const { preview } = service;
  const next = nextService(industry, service);
  return (
    <>
      <HubHeader back={{ href: `/${industry.slug}`, label: `${industry.name} services` }} />
      <main className="flex-1">
        <Container className="grid gap-x-16 gap-y-12 pt-6 pb-16 sm:pt-10 sm:pb-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
          <div className="lg:col-start-1">
            <nav aria-label="Breadcrumb" className="text-sm text-muted">
              <Link href={`/${industry.slug}`} className="font-semibold text-ink hover:text-brand">
                {industry.name}
              </Link>
              <span aria-hidden className="mx-2">
                /
              </span>
              <span aria-current="page">{service.name}</span>
            </nav>
            <div className="mt-6">
              <StatusPill status={service.status} />
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink sm:text-5xl">{service.name}</h1>
            <p className="mt-5 max-w-xl text-lg text-muted sm:text-xl">{preview.intro}</p>
          </div>

          <figure className="lg:sticky lg:top-8 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
            <MockView mock={preview.mock} />
            <figcaption className="mt-4 text-center text-sm text-muted">Mock-up. Names, numbers and prices are made up.</figcaption>
          </figure>

          <div className="lg:col-start-1">
            <section aria-labelledby="gets">
              <h2 id="gets" className="text-2xl font-bold tracking-tight text-ink">
                What you get
              </h2>
              <ul className="mt-5 space-y-3">
                {preview.gets.map((g) => (
                  <li key={g} className="flex gap-3 text-lg text-ink">
                    <Dot className="mt-2.5" />
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="how" className="mt-14">
              <h2 id="how" className="text-2xl font-bold tracking-tight text-ink">
                How it works
              </h2>
              <ol className="mt-5 space-y-3">
                {preview.steps.map((s, i) => (
                  <li key={s.title} className="flex gap-4 rounded-card bg-surface p-5 ring-1 ring-line sm:gap-5 sm:p-6">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-ink">{s.title}</h3>
                      <p className="mt-1 text-muted">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <Link
              href={serviceHref(industry, next)}
              className="group mt-14 flex items-center justify-between gap-4 rounded-card bg-ink p-6 text-white transition hover:bg-brand-strong sm:p-7"
            >
              <span>
                <span className="block text-sm text-white/80">Next service</span>
                <span className="mt-1 block text-xl font-bold">{next.name}</span>
              </span>
              <span aria-hidden className="text-2xl transition group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </Container>
      </main>
      <HubFooter />
    </>
  );
}
