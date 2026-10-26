"use client";

import { ArrowUpRight, Compass, GlassWater, MapPin, Mic2, Music, Palette, RotateCcw, ShoppingBag, SlidersHorizontal, Sparkles, type LucideIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { BookingsDrawer } from "./BookingsDrawer";
import {
  CATEGORIES,
  CITIES,
  INITIAL_EVENTS,
  SAMPLE_BOOKING,
  filterEvents,
  formatINR,
  posterGradient,
  site,
  type BookingRecord,
  type CityName,
  type DateFilter,
  type EventCategory,
  type EventItem,
} from "./data";
import { EventCard } from "./EventCard";
import { EventDetailDrawer } from "./EventDetailDrawer";
import { HeroCarousel } from "./HeroCarousel";
import { ListEventModal } from "./ListEventModal";
import { AnimatePresence, SalsaMotion } from "./Motion";
import { Navbar } from "./Navbar";
import { PartnerBanner } from "./PartnerBanner";
import { Wordmark } from "./Wordmark";

const CATEGORY_ICONS: Record<EventCategory, LucideIcon> = {
  All: Compass,
  "Music & Gigs": Music,
  Nightlife: GlassWater,
  Comedy: Mic2,
  Festivals: Sparkles,
  Workshops: Palette,
  "Flea Markets": ShoppingBag,
};

const DATE_FILTERS: DateFilter[] = ["Any", "Today", "This Week", "This Month"];

/**
 * The ShowSalsa app: filters, the trending grid, curated exclusives, the organiser banner, and the drawers.
 * Everything lives in page state. New passes and listed events last until the page is reloaded.
 */
export function ShowSalsaApp() {
  const [events, setEvents] = useState<EventItem[]>(INITIAL_EVENTS);
  const [selectedCity, setSelectedCity] = useState<CityName>("All Cities");
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>("All");
  const [dateFilter, setDateFilter] = useState<DateFilter>("Any");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isBookingsOpen, setIsBookingsOpen] = useState(false);
  const [activeView, setActiveView] = useState<"discover" | "partner">("discover");
  const [bookings, setBookings] = useState<BookingRecord[]>([SAMPLE_BOOKING]);

  const spotlightEvents = useMemo(() => events.filter((e) => e.isSpotlight), [events]);
  const filteredEvents = useMemo(
    () => filterEvents(events, { city: selectedCity, category: selectedCategory, dateFilter, searchQuery }),
    [events, selectedCity, selectedCategory, dateFilter, searchQuery],
  );
  const curatedExclusives = useMemo(() => events.filter((e) => e.isCuratedExclusive).slice(0, 4), [events]);

  const hasActiveFilters = selectedCity !== "All Cities" || selectedCategory !== "All" || dateFilter !== "Any" || searchQuery.trim().length > 0;

  // Escape closes the top-most dialog.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (selectedEvent) setSelectedEvent(null);
      else if (isListModalOpen) setIsListModalOpen(false);
      else if (isBookingsOpen) setIsBookingsOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedEvent, isListModalOpen, isBookingsOpen]);

  const handleResetFilters = () => {
    setSelectedCity("All Cities");
    setSelectedCategory("All");
    setDateFilter("Any");
    setSearchQuery("");
  };

  const handleCreateEvent = (created: EventItem) => {
    setEvents((prev) => [created, ...prev]);
    setSelectedEvent(created);
  };

  const handleSwitchView = (view: "discover" | "partner") => {
    setActiveView(view);
    if (view === "partner") document.getElementById("partner-with-us")?.scrollIntoView({ behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <SalsaMotion>
      <div className="relative flex min-h-screen flex-col bg-wing-night text-wing-text">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[520px] bg-[radial-gradient(ellipse_80%_50%_at_50%_-15%,rgba(124,58,237,0.16),rgba(225,29,72,0.08),transparent)]"
        />

        <Navbar
          selectedCity={selectedCity}
          onSelectCity={setSelectedCity}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenPartnerModal={() => setIsListModalOpen(true)}
          onOpenBookingsDrawer={() => setIsBookingsOpen(true)}
          bookingsCount={bookings.length}
          activeView={activeView}
          onSwitchView={handleSwitchView}
        />

        <main className="relative z-10 flex-1 pb-16">
          <HeroCarousel events={spotlightEvents} onSelectEvent={setSelectedEvent} />

          {/* Category chips and the date filter */}
          <section aria-label="Event Categories and Time Filters" className="mx-auto max-w-[1400px] px-4 pt-6 pb-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-center">
              <div role="tablist" aria-label="Filter by Event Category" className="no-scrollbar flex items-center gap-2.5 overflow-x-auto pb-2 lg:pb-0">
                {CATEGORIES.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat.id];
                  const active = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all sm:text-sm ${
                        active
                          ? "border-transparent bg-linear-to-r from-wing-rose to-wing-purple text-white shadow-lg shadow-wing-rose/25"
                          : "border-white/10 bg-white/[0.04] text-wing-zinc-300 hover:bg-white/[0.08] hover:text-white"
                      }`}
                    >
                      <Icon aria-hidden className="h-3.5 w-3.5 shrink-0" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              <div role="group" aria-label="Filter by date" className="flex shrink-0 items-center gap-1.5 self-start rounded-full border border-white/10 bg-white/[0.04] p-1 lg:self-auto">
                {DATE_FILTERS.map((df) => {
                  const active = dateFilter === df;
                  return (
                    <button
                      key={df}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setDateFilter(df)}
                      className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                        active ? "bg-white/15 text-white shadow-sm" : "text-wing-zinc-400 hover:text-wing-zinc-200"
                      }`}
                    >
                      {df}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Newly added and trending */}
          <section aria-labelledby="trending-heading" className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h2 id="trending-heading" className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  {selectedCity === "All Cities" ? "Newly Added & Trending" : `Trending in ${selectedCity}`}
                </h2>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium whitespace-nowrap text-wing-zinc-300 transition-colors hover:bg-white/[0.12]"
                  >
                    <RotateCcw aria-hidden className="h-3 w-3" />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-wing-zinc-400" aria-live="polite">
                <SlidersHorizontal aria-hidden className="h-3.5 w-3.5 text-wing-rose" />
                <span>
                  Showing <strong className="text-white">{filteredEvents.length}</strong> live experiences
                </span>
              </div>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="space-y-4 rounded-3xl border border-white/10 bg-wing-panel p-12 text-center">
                <p className="font-wing-display text-xl font-bold text-white">No matching events found</p>
                <p className="mx-auto max-w-md text-sm text-wing-zinc-400">
                  We couldn’t find any gigs matching your current city, category, or search filter. Try clearing your filters to explore all shows.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-wing-rose px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-wing-rose-light"
                >
                  <RotateCcw aria-hidden className="h-3.5 w-3.5" />
                  <span>Show All Experiences</span>
                </button>
              </div>
            ) : (
              <div data-testid="event-cards-grid" className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                {filteredEvents.map((event) => (
                  <EventCard key={event.id} event={event} onSelect={setSelectedEvent} />
                ))}
              </div>
            )}
          </section>

          {/* Curated exclusives */}
          <section aria-labelledby="exclusives-heading" className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="text-xs font-medium text-wing-amber">Handpicked Arena Tours & Intimate Experiences</div>
                <h2 id="exclusives-heading" className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  Curated Exclusives
                </h2>
              </div>
              <p className="text-xs text-wing-zinc-400 sm:text-sm">VIP Fanpits · Backstage Lounges · Verified Artist Lineups</p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {curatedExclusives.map((evt) => (
                <div
                  key={evt.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-wing-panel shadow-xl transition-all duration-200 hover:-translate-y-1 hover:border-wing-violet/50"
                >
                  <div>
                    <div className="relative h-48 overflow-hidden" style={{ backgroundImage: posterGradient(evt.poster) }}>
                      <Image
                        src={evt.image}
                        alt={evt.title}
                        fill
                        sizes="(min-width: 1400px) 320px, (min-width: 1024px) 23vw, (min-width: 768px) 46vw, 92vw"
                        className="object-cover opacity-75 transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-wing-panel via-transparent to-black/30" />
                      <div className="absolute top-3 left-3 rounded-md border border-white/10 bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-wing-amber-300 tabular-nums backdrop-blur-md">
                        EXCLUSIVE · {evt.city.toUpperCase()}
                      </div>
                    </div>

                    <div className="space-y-2 p-5">
                      <div className="text-xs text-wing-zinc-400">
                        {evt.dateLabel} · {evt.timeLabel} · {evt.category}
                      </div>
                      <h3 className="line-clamp-1 text-lg font-bold text-white transition-colors group-hover:text-wing-rose-light">{evt.title}</h3>
                      <p className="line-clamp-2 text-xs leading-relaxed text-wing-zinc-400">{evt.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 px-5 pt-3 pb-5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-[11px] text-wing-zinc-400">
                        <MapPin aria-hidden className="h-3 w-3 shrink-0 text-wing-orchid" />
                        <span className="max-w-[140px] truncate">{evt.venue}</span>
                      </div>
                      <div className="mt-0.5 text-sm font-bold text-wing-amber tabular-nums">{formatINR(evt.startingPrice, true)}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedEvent(evt)}
                      aria-label={`Book Pass for ${evt.title}`}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-white/[0.06] px-3.5 py-2 text-xs font-semibold whitespace-nowrap text-white transition-colors group-hover:bg-wing-rose"
                    >
                      <span>Book Pass</span>
                      <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <PartnerBanner onOpenListEventModal={() => setIsListModalOpen(true)} />
        </main>

        <footer className="relative z-10 border-t border-white/10 bg-wing-night-deep py-12">
          <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-8 px-4 sm:px-6 md:flex-row md:items-center lg:px-8">
            <div className="space-y-2">
              <Wordmark />
              <p className="max-w-sm text-xs text-wing-zinc-400">
                India’s premier nightlife, live concert, and cultural ticketing platform. Instant QR passes and 48-hour organizer settlements.
              </p>
            </div>

            <nav aria-label="Events by city" className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-wing-zinc-400">
              {CITIES.filter((c) => c !== "All Cities").map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => {
                    setSelectedCity(city);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="cursor-pointer transition-colors hover:text-white"
                >
                  Events in {city}
                </button>
              ))}
            </nav>

            <div className="text-xs text-wing-zinc-400">© 2026 {site.name}. {site.name} is a made-up platform for an onlydevs demo.</div>
          </div>
        </footer>

        <AnimatePresence>
          {selectedEvent && (
            <EventDetailDrawer
              key={selectedEvent.id}
              event={selectedEvent}
              onClose={() => setSelectedEvent(null)}
              onCompleteBooking={(b) => setBookings((prev) => [b, ...prev])}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isListModalOpen && <ListEventModal key="list" onClose={() => setIsListModalOpen(false)} onCreateEvent={handleCreateEvent} />}
        </AnimatePresence>

        <AnimatePresence>{isBookingsOpen && <BookingsDrawer key="passes" onClose={() => setIsBookingsOpen(false)} bookings={bookings} />}</AnimatePresence>
      </div>
    </SalsaMotion>
  );
}
