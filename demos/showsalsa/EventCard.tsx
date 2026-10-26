"use client";

import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { formatINR, posterGradient, type EventItem } from "./data";

interface EventCardProps {
  event: EventItem;
  onSelect: (event: EventItem) => void;
}

/** A 3:4 poster card in the trending grid. The whole card opens the event drawer. */
export function EventCard({ event, onSelect }: EventCardProps) {
  return (
    <article className="group flex flex-col">
      <button
        type="button"
        onClick={() => onSelect(event)}
        aria-label={`View details and book tickets for ${event.title}`}
        className="w-full rounded-2xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-wing-rose"
      >
        <div
          className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-white/10 shadow-lg transition-all duration-200 group-hover:-translate-y-1 group-hover:border-wing-rose/50 group-hover:shadow-2xl group-hover:shadow-wing-rose/15"
          style={{ backgroundImage: posterGradient(event.poster, "to bottom") }}
        >
          <Image
            src={event.image}
            alt={event.title}
            fill
            sizes="(min-width: 1400px) 256px, (min-width: 1024px) 18vw, (min-width: 768px) 30vw, (min-width: 640px) 46vw, 92vw"
            className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />

          <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/25 to-black/30" />

          <div className="absolute top-3 right-3 rounded-lg border border-white/15 bg-black/75 px-2.5 py-1 text-[11px] font-semibold text-white tabular-nums backdrop-blur-md">
            {event.dateLabel}
          </div>

          <div className="pointer-events-none absolute inset-x-3.5 bottom-3.5 flex flex-col justify-end">
            <span className="truncate text-[10px] tracking-wider text-wing-zinc-300/90 uppercase tabular-nums">{event.posterTagline}</span>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="truncate text-xs font-medium text-white/90">{event.city}</span>
              <span className="inline-flex items-center gap-1 rounded-md bg-wing-rose/90 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <span>Tickets</span>
                <ArrowUpRight aria-hidden className="h-3 w-3" />
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 px-0.5 pt-3.5">
          <h3 className="line-clamp-1 text-base font-bold text-white transition-colors group-hover:text-wing-rose-light sm:text-[17px]">{event.title}</h3>

          <div className="flex items-center gap-2 text-xs font-medium text-wing-zinc-300">
            <span>{event.dateLabel}</span>
            <span aria-hidden="true">|</span>
            <span>{event.timeLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="text-wing-zinc-400">{event.category}</span>
          </div>

          <div className="pt-0.5 text-sm font-bold text-wing-amber tabular-nums">{formatINR(event.startingPrice, true)}</div>

          <p className="truncate text-xs text-wing-zinc-400">
            {event.venue}, {event.city}
          </p>
        </div>
      </button>
    </article>
  );
}
