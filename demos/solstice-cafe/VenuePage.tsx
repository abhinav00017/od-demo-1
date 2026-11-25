import { ArrowLeft, ArrowUpRight, Check, Clock, Info, Users } from "lucide-react";
import Link from "next/link";
import { EnquiryForm } from "./EnquiryForm";
import { fromPrice, minimumLine, VENUES, venueHref, type Venue } from "./events";
import { MagneticButton } from "./MagneticButton";
import { SolsticeShell } from "./SolsticeSite";
import { VenueGallery } from "./VenueGallery";

/**
 * One event venue's page: photos, who it suits, what is included, the "from" price and the enquiry form.
 * Server-rendered and static; the gallery, the form and the motion are client parts.
 */
export function VenuePage({ venue, hubHref }: { venue: Venue; hubHref: string }) {
  const other = VENUES.find((v) => v.id !== venue.id);
  return (
    <SolsticeShell hubHref={hubHref}>
      <main>
        <section className="mx-auto max-w-7xl px-6 pt-8 pb-10 lg:px-8 lg:pt-10">
          <Link
            href="/cafe/website#events"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-sol-stone-600 underline-offset-4 hover:text-sol-ink hover:underline"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            <span>Back to the cafe</span>
          </Link>

          <div className="mt-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-sol-sage">
                <span>Events at Solstice</span>
                <span aria-hidden="true">·</span>
                <span>{venue.kind}</span>
              </div>
              <h1 className="mt-2 font-sol-display text-[clamp(2.2rem,4vw,3.25rem)] leading-[1.08] font-normal tracking-tight text-balance text-sol-ink">
                {venue.name}
              </h1>
              <p className="mt-4 text-base leading-relaxed text-sol-stone-600 lg:text-lg">{venue.intro}</p>
            </div>
            <div className="shrink-0 lg:text-right">
              <p className="text-lg font-semibold text-sol-ink">{fromPrice(venue)}</p>
              <p className="mt-1 text-xs text-sol-stone-500">{minimumLine(venue)}</p>
              <div className="mt-4">
                <MagneticButton
                  href="#enquire"
                  className="gap-2 rounded-lg bg-sol-ink px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-sol-stone-800"
                >
                  <span>Send enquiry</span>
                  <ArrowUpRight aria-hidden className="h-4 w-4" />
                </MagneticButton>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <VenueGallery photos={venue.photos} venueName={venue.name} />
          </div>
        </section>

        <section className="border-t border-sol-stone-200/80 bg-white py-14 lg:py-20">
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-12 px-6 lg:grid-cols-12 lg:px-8">
            <div className="space-y-10 lg:col-span-5">
              <dl className="grid grid-cols-2 gap-6 border-b border-sol-stone-200/80 pb-8">
                <div>
                  <dt className="flex items-center gap-2 text-xs text-sol-stone-500">
                    <Users aria-hidden className="h-4 w-4 text-sol-sage" />
                    Guests
                  </dt>
                  <dd className="mt-1 font-sol-mono text-2xl font-medium text-sol-ink tabular-nums">
                    {venue.minGuests}–{venue.maxGuests}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 text-xs text-sol-stone-500">
                    <Clock aria-hidden className="h-4 w-4 text-sol-sage" />
                    Time
                  </dt>
                  <dd className="mt-1 font-sol-mono text-2xl font-medium text-sol-ink tabular-nums">3 hours</dd>
                </div>
              </dl>

              <div>
                <h2 className="font-sol-display text-2xl font-normal text-sol-ink">What&apos;s included</h2>
                <ul className="mt-4 space-y-3">
                  {venue.included.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-sol-stone-700">
                      <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-sol-sage" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="font-sol-display text-2xl font-normal text-sol-ink">Good for</h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {venue.goodFor.map((g) => (
                    <li key={g} className="rounded-full border border-sol-stone-200 bg-sol-paper px-3.5 py-1.5 text-sm text-sol-stone-700">
                      {g}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="font-sol-display text-2xl font-normal text-sol-ink">Time slots</h2>
                <ul className="mt-4 divide-y divide-sol-stone-100 rounded-xl border border-sol-stone-200/80">
                  {venue.slots.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                      <span className="font-medium text-sol-ink">{s.label}</span>
                      <span className="font-sol-mono text-sol-stone-600 tabular-nums">{s.time}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <ul className="space-y-2">
                {venue.notes.map((n) => (
                  <li key={n} className="flex items-start gap-3 text-sm leading-relaxed text-sol-stone-600">
                    <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-sol-stone-500" />
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div id="enquire" className="scroll-mt-24 rounded-2xl border border-sol-stone-200/90 bg-sol-paper p-6 sm:p-8 lg:col-span-7">
              <h2 className="font-sol-display text-2xl font-normal text-sol-ink">Send an enquiry</h2>
              <p className="mt-1 text-sm text-sol-stone-600">
                {fromPrice(venue)}. {minimumLine(venue)}. The final price depends on the menu and the number of guests. We call you to
                confirm the final quote.
              </p>
              <div className="mt-6">
                <EnquiryForm venue={venue} />
              </div>
            </div>
          </div>
        </section>

        {other ? (
          <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
            <Link
              href={venueHref(other)}
              className="group flex flex-col justify-between gap-4 rounded-xl border border-sol-stone-200/80 bg-white p-6 transition-shadow hover:shadow-lg sm:flex-row sm:items-center"
            >
              <div>
                <p className="text-xs font-medium text-sol-sage">Also at Solstice</p>
                <p className="mt-1 text-lg font-semibold text-sol-ink">
                  {other.name} <span className="font-normal text-sol-stone-600">· {other.kind}</span>
                </p>
                <p className="mt-1 text-sm text-sol-stone-600">
                  Up to {other.maxGuests} guests · {fromPrice(other)}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-sol-sage group-hover:underline group-hover:underline-offset-4">
                See {other.name}
                <ArrowUpRight aria-hidden className="h-4 w-4" />
              </span>
            </Link>
          </section>
        ) : null}
      </main>
    </SolsticeShell>
  );
}
