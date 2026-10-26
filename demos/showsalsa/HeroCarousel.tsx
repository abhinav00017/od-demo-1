"use client";

import { ArrowUpRight, Calendar, ChevronLeft, ChevronRight, MapPin, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { formatINR, posterGradient, type EventItem } from "./data";
import { AnimatePresence, HeroFade } from "./Motion";

interface HeroCarouselProps {
  events: EventItem[];
  onSelectEvent: (event: EventItem) => void;
}

/** The spotlight carousel. Moves on every 6.5 s, as the export did, unless the visitor asks for less motion. */
export function HeroCarousel({ events, onSelectEvent }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const safeIndex = events.length > 0 ? activeIndex % events.length : 0;
  const current = events[safeIndex];

  useEffect(() => {
    if (events.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setActiveIndex((prev) => (prev + 1) % events.length), 6500);
    return () => clearInterval(timer);
  }, [events.length]);

  if (!current) return null;

  const handlePrev = () => setActiveIndex((prev) => (prev - 1 + events.length) % events.length);
  const handleNext = () => setActiveIndex((prev) => (prev + 1) % events.length);

  return (
    <section aria-label="Featured Spotlight Events" className="relative mx-auto max-w-[1400px] px-4 pt-6 pb-4 sm:px-6 lg:px-8">
      <div className="relative flex min-h-[400px] flex-col justify-end overflow-hidden rounded-3xl border border-white/10 bg-wing-panel shadow-2xl sm:min-h-[440px]">
        {/* Photo over the poster gradient, then the scrims */}
        <div className="absolute inset-0">
          <AnimatePresence initial={false}>
            <HeroFade key={current.id} className="absolute inset-0">
              <div className="absolute inset-0" style={{ backgroundImage: posterGradient(current.poster) }} />
              <Image
                src={current.image}
                alt={current.title}
                fill
                sizes="(min-width: 1400px) 1336px, 100vw"
                // Every spotlight sits above the fold when it shows; the first one is the page's LCP.
                loading="eager"
                fetchPriority={safeIndex === 0 ? "high" : undefined}
                className="scale-105 object-cover object-center opacity-55 transition-transform duration-700"
              />
            </HeroFade>
          </AnimatePresence>
          <div className="absolute inset-0 bg-linear-to-t from-wing-night via-wing-night/70 to-transparent" />
          <div className="absolute inset-0 bg-linear-to-r from-wing-night via-wing-night/65 to-transparent" />
        </div>

        {/* Copy and the booking callout */}
        <div className="relative z-10 flex flex-col justify-between gap-8 p-6 pt-16 sm:p-10 sm:pt-16 lg:flex-row lg:items-end lg:p-12">
          <div className="max-w-2xl space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-wing-amber-400 sm:text-sm">
              <span>Flagship Spotlight</span>
              <span aria-hidden="true">·</span>
              <span className="text-wing-zinc-200">{current.category}</span>
              <span aria-hidden="true">·</span>
              <span className="text-wing-zinc-300">
                {current.dateLabel}, {current.timeLabel}
              </span>
            </div>

            <h1 className="text-3xl leading-[1.1] font-extrabold tracking-tight text-balance text-white sm:text-4xl lg:text-5xl">
              {current.title}
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-wing-zinc-300 sm:text-base">{current.subtitle}</p>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs text-wing-zinc-300 sm:text-sm">
              <span className="inline-flex items-center gap-1.5">
                <MapPin aria-hidden className="h-4 w-4 shrink-0 text-wing-rose" />
                <span>
                  {current.venue}, {current.city}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar aria-hidden className="h-4 w-4 shrink-0 text-wing-orchid" />
                <span>{current.dateSlots.join(" / ")}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-wing-emerald-400">
                <ShieldCheck aria-hidden className="h-4 w-4 shrink-0" />
                <span>Instant M-Ticket QR</span>
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md sm:min-w-[270px] sm:flex-row sm:items-center lg:flex-col lg:items-end">
            <div className="w-full text-left lg:text-right">
              <div className="text-xs text-wing-zinc-400">Tickets Starting From</div>
              <div className="mt-0.5 text-2xl font-extrabold text-wing-amber tabular-nums sm:text-3xl">{formatINR(current.startingPrice, true)}</div>
              <div className="mt-0.5 text-[11px] text-wing-zinc-400">{current.ageLimit}</div>
            </div>

            <button
              type="button"
              onClick={() => onSelectEvent(current)}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-wing-rose px-6 py-3.5 text-sm font-semibold whitespace-nowrap text-white shadow-lg shadow-wing-rose/30 transition-all hover:bg-wing-rose-light sm:w-auto lg:w-full"
            >
              <span>Book Now</span>
              <ArrowUpRight aria-hidden className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Carousel controls */}
        <div className="absolute top-5 right-5 z-20 flex items-center gap-2">
          <div className="mr-2 hidden items-center gap-1.5 sm:flex">
            {events.map((evt, idx) => (
              <button
                key={evt.id}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`View spotlight ${evt.title}`}
                aria-current={idx === safeIndex}
                className={`h-1.5 rounded-full transition-all ${idx === safeIndex ? "w-7 bg-wing-rose" : "w-2 bg-white/25 hover:bg-white/50"}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous spotlight event"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-white/15"
          >
            <ChevronLeft aria-hidden className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next spotlight event"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-white/15"
          >
            <ChevronRight aria-hidden className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
