import { ArrowUpRight, Users } from "lucide-react";
import Link from "next/link";
import { SectionPhoto } from "./CafeArtVisuals";
import { fromPrice, VENUES, venueHref } from "./events";
import { CardRise } from "./Motion";

/**
 * The Events section on the cafe home page: two venue cards. Each card opens that venue's own page,
 * with its photos, what is included and the enquiry form.
 */
/** `eager` loads the two cover photos at once: on /cafe/website/events they are the first thing on screen. */
export function EventsSection({ eager = false }: { eager?: boolean }) {
  return (
    <section id="events" aria-labelledby="events-title" className="scroll-mt-24 border-t border-sol-stone-200/80 bg-sol-oat/60 py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-medium text-sol-sage">
              <span>Parties &amp; Small Functions</span>
              <span aria-hidden="true">·</span>
              <span>Two Private Spaces</span>
            </div>
            <h2 id="events-title" className="mt-2 font-sol-display text-3xl font-normal tracking-tight text-balance text-sol-ink lg:text-4xl">
              Host Your Celebration at Solstice
            </h2>
          </div>
          <p className="max-w-md text-sm text-sol-stone-600">
            Book the garden or the glasshouse room for a birthday, a kitty party or a team lunch. Send an enquiry and we call you
            back with a final quote.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
          {VENUES.map((venue, idx) => (
            <CardRise
              key={venue.id}
              index={idx}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-sol-stone-200/80 bg-white transition-shadow duration-200 hover:shadow-xl has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-sol-sage has-[a:focus-visible]:ring-offset-2"
            >
              <SectionPhoto
                imageUrl={venue.photos[0].src}
                eager={eager}
                alt={venue.photos[0].alt}
                sizes="(min-width: 1280px) 600px, (min-width: 768px) 50vw, 100vw"
                className="aspect-[16/10] w-full border-b border-sol-stone-100"
              />
              <div className="flex flex-1 flex-col p-6">
                <p className="text-xs font-medium text-sol-sage">{venue.kind}</p>
                <h3 className="mt-2 text-xl font-semibold text-sol-ink">
                  {/* The link covers the whole card, so a tap anywhere opens the venue page. */}
                  <Link href={venueHref(venue)} className="after:absolute after:inset-0 focus-visible:outline-none">
                    {venue.name}
                  </Link>
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-sol-stone-600">{venue.short}</p>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-sol-stone-100 pt-5">
                  <p className="flex items-center gap-2 text-sm text-sol-stone-700">
                    <Users aria-hidden className="h-4 w-4 text-sol-sage" />
                    <span>
                      Up to <span className="font-sol-mono tabular-nums">{venue.maxGuests}</span> guests
                    </span>
                  </p>
                  <p className="text-sm font-semibold text-sol-ink">{fromPrice(venue)}</p>
                </div>
                <p className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-sol-sage group-hover:underline group-hover:underline-offset-4">
                  <span>See the venue &amp; send an enquiry</span>
                  <ArrowUpRight aria-hidden className="h-4 w-4" />
                </p>
              </div>
            </CardRise>
          ))}
        </div>
      </div>
    </section>
  );
}
