import Link from "next/link";
import type { Industry } from "@/lib/schema";
import { Container } from "@/components/hub/Container";
import { Dot } from "@/components/hub/Dot";
import { HubFooter } from "@/components/hub/HubFooter";
import { IndustryIcon } from "@/components/hub/IndustryIcon";
import { Logo } from "@/components/hub/Logo";

export function Landing({ industries }: { industries: Industry[] }) {
  return (
    <div className="flex flex-1 flex-col bg-linear-to-b from-canvas to-canvas-deep">
      <main className="flex-1">
        <Container className="pt-12 pb-16 sm:pt-20 sm:pb-24">
          <Logo size="lg" eager />
          {/* Brand grey #757E82 passes AA only as large text (24px+), so small screens use the darker muted grey. */}
          <p className="mt-4 text-lg text-muted sm:text-2xl sm:text-tagline">
            Making business easy and <span className="whitespace-nowrap">stress-free.</span>
          </p>

          <h1 className="mt-16 max-w-3xl text-4xl leading-[1.08] font-bold tracking-tight text-ink sm:mt-24 sm:text-6xl">
            Pick a business to see what we build<span className="text-brand">.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Each one opens the services we set up for that business, with a demo you can try.
          </p>

          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Businesses">
            {industries.map((industry) => {
              const live = industry.services.filter((s) => s.status === "live").length;
              return (
                <li key={industry.slug}>
                  <Link
                    href={`/${industry.slug}`}
                    className="group flex h-full flex-col rounded-card bg-surface p-7 shadow-sm ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-md hover:ring-brand sm:p-8"
                  >
                    <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                      <IndustryIcon icon={industry.icon} />
                    </span>
                    <h2 className="mt-8 text-3xl font-bold tracking-tight text-ink">{industry.name}</h2>
                    <p className="mt-3 text-muted">{industry.audience}</p>
                    <p className="mt-auto flex items-center gap-2 pt-8 text-sm font-semibold text-ink">
                      <Dot />
                      {industry.services.length} services{live ? ` · ${live} live demo` : ""}
                      <span aria-hidden className="ml-auto text-xl text-brand transition group-hover:translate-x-1">
                        →
                      </span>
                    </p>
                  </Link>
                </li>
              );
            })}
            <li>
              <div className="flex h-full flex-col rounded-card border-2 border-dashed border-line p-7 sm:p-8">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-chip text-2xl font-bold text-muted" aria-hidden>
                  +
                </span>
                <h2 className="mt-8 text-3xl font-bold tracking-tight text-muted">More coming</h2>
                <p className="mt-3 text-muted">Salons, gyms, tutors and shops are next.</p>
              </div>
            </li>
          </ul>
        </Container>
      </main>
      <HubFooter />
    </div>
  );
}
