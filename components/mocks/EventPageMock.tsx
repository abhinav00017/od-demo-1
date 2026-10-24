import type { Mock } from "@/lib/schema";
import { BrowserFrame } from "./Frames";

type EventPage = Extract<Mock, { kind: "event-page" }>;

/** An organiser's event page: the show, when and where, then the ticket tiers and a book button. */
export function EventPageMock({ mock }: { mock: EventPage }) {
  return (
    <BrowserFrame url={mock.url}>
      <div className="bg-ink px-5 pt-4 pb-6 text-white sm:px-6">
        <p className="text-xs font-semibold tracking-wide uppercase">{mock.organiser} presents</p>
        <p className="mt-3 text-2xl leading-tight font-bold sm:text-3xl">{mock.title}</p>
        <p className="mt-2 text-sm">{mock.when}</p>
        <p className="text-sm">{mock.venue}</p>
      </div>
      <div className="bg-white p-5 sm:p-6">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">Tickets</p>
        <ul className="mt-2 divide-y divide-line">
          {mock.tiers.map((tier) => (
            <li key={tier.name} className="flex items-center justify-between gap-3 py-3">
              <span className="min-w-0">
                <span className={`block text-sm font-semibold ${tier.soldOut ? "text-muted line-through" : "text-ink"}`}>{tier.name}</span>
                {tier.note ? <span className="block text-xs text-muted">{tier.note}</span> : null}
              </span>
              <span className={`shrink-0 text-sm font-bold tabular-nums ${tier.soldOut ? "text-muted" : "text-ink"}`}>
                {tier.soldOut ? "Sold out" : tier.price}
              </span>
            </li>
          ))}
        </ul>
        <span className="mt-4 block rounded-full bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white">{mock.cta}</span>
      </div>
    </BrowserFrame>
  );
}
