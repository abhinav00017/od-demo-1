"use client";

import { Check, ChevronDown, MapPin, PlusCircle, Search, Sparkles, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CITIES, type CityName } from "./data";
import { Wordmark } from "./Wordmark";

interface NavbarProps {
  selectedCity: CityName;
  onSelectCity: (city: CityName) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenPartnerModal: () => void;
  onOpenBookingsDrawer: () => void;
  bookingsCount: number;
  activeView: "discover" | "partner";
  onSwitchView: (view: "discover" | "partner") => void;
}

/** The city picker. Below 640px it moves to the second header row, next to the search, so the top row fits a phone. */
function CitySelect({ selectedCity, onSelectCity, className }: { selectedCity: CityName; onSelectCity: (c: CityName) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className ?? ""}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={`Select City: ${selectedCity}`}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium whitespace-nowrap text-wing-zinc-200 transition-colors hover:bg-white/[0.08]"
      >
        <MapPin aria-hidden className="h-4 w-4 shrink-0 text-wing-orchid" />
        <span>{selectedCity}</span>
        <ChevronDown aria-hidden className={`h-3.5 w-3.5 text-wing-zinc-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-56 rounded-2xl border border-white/15 bg-wing-panel py-2 shadow-2xl backdrop-blur-2xl">
          <div className="border-b border-white/5 px-3 py-1.5 text-[11px] font-medium text-wing-zinc-400">Select Discovery Region</div>
          <div role="listbox" aria-label="Cities" className="max-h-64 overflow-y-auto py-1">
            {CITIES.map((city) => {
              const active = city === selectedCity;
              return (
                <button
                  key={city}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onSelectCity(city);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3.5 py-2 text-sm transition-colors ${
                    active ? "bg-wing-rose/15 font-semibold text-white" : "text-wing-zinc-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>{city}</span>
                  {active && <Check aria-hidden className="h-4 w-4 text-wing-rose" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function Navbar({
  selectedCity,
  onSelectCity,
  searchQuery,
  onSearchChange,
  onOpenPartnerModal,
  onOpenBookingsDrawer,
  bookingsCount,
  activeView,
  onSwitchView,
}: NavbarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-wing-night/85 backdrop-blur-xl transition-colors">
      <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left: logo and city picker */}
        <div className="flex shrink-0 items-center gap-4 sm:gap-6">
          <button
            type="button"
            onClick={() => onSwitchView("discover")}
            className="group flex items-center gap-1.5 text-left focus:outline-none"
            aria-label="TicketWings Home"
          >
            <Wordmark className="text-xl sm:text-2xl" />
          </button>

          <div className="hidden h-6 w-[1px] bg-white/10 sm:block" />

          <CitySelect selectedCity={selectedCity} onSelectCity={onSelectCity} className="hidden sm:block" />
        </div>

        {/* Centre: command-palette search */}
        <div className="hidden max-w-xl flex-1 md:block">
          <div className="relative flex items-center">
            <Search aria-hidden className="pointer-events-none absolute left-4 h-4 w-4 text-wing-zinc-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search for artists, gigs, venues, or cities..."
              aria-label="Search for artists, gigs, venues, or cities"
              className="w-full rounded-full border border-white/10 bg-white/[0.06] py-2.5 pr-20 pl-11 text-sm text-white transition-all placeholder:text-wing-zinc-400 hover:bg-white/[0.09] focus:border-wing-rose/60 focus:bg-wing-search focus:outline-none"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                aria-label="Clear search query"
                className="absolute right-3 rounded-full p-1 text-wing-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X aria-hidden className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span className="pointer-events-none absolute right-3.5 rounded-md border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold text-wing-zinc-400">
                Ctrl K
              </span>
            )}
          </div>
        </div>

        {/* Right: organiser hub, list your event, my passes */}
        <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => onSwitchView(activeView === "partner" ? "discover" : "partner")}
            className={`hidden items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-colors lg:inline-flex ${
              activeView === "partner" ? "bg-white/10 text-white" : "text-wing-zinc-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Sparkles aria-hidden className="h-3.5 w-3.5 text-wing-amber" />
            <span>Organizer Hub</span>
          </button>

          <button
            type="button"
            onClick={onOpenPartnerModal}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-linear-to-r from-wing-rose to-wing-rose-deep px-3.5 py-2 text-xs font-semibold whitespace-nowrap text-white shadow-lg shadow-wing-rose/20 transition-all hover:from-wing-rose-light hover:to-wing-rose sm:px-4 sm:text-sm"
          >
            <PlusCircle aria-hidden className="h-4 w-4" />
            <span className="sm:hidden">List</span>
            <span className="hidden sm:inline">List Your Event</span>
          </button>

          <button
            type="button"
            onClick={onOpenBookingsDrawer}
            aria-label={`My Passes (${bookingsCount})`}
            className="relative inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium whitespace-nowrap text-wing-zinc-200 transition-colors hover:bg-white/[0.1] sm:text-sm"
          >
            <User aria-hidden className="h-4 w-4 text-wing-zinc-300" />
            <span className="hidden sm:inline">My Passes</span>
            {bookingsCount > 0 && (
              <span className="rounded-full bg-wing-amber px-1.5 py-0.5 text-[11px] font-bold text-black tabular-nums">{bookingsCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Phones: city picker and search on a second row */}
      <div className="flex items-center gap-2 px-4 pb-3 md:hidden">
        <CitySelect selectedCity={selectedCity} onSelectCity={onSelectCity} className="shrink-0 sm:hidden" />
        <div className="relative flex flex-1 items-center">
          <Search aria-hidden className="pointer-events-none absolute left-3.5 h-4 w-4 text-wing-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search artists, gigs, venues..."
            aria-label="Search events"
            className="w-full min-w-0 rounded-full border border-white/10 bg-white/[0.06] py-2 pr-9 pl-10 text-sm text-white placeholder:text-wing-zinc-400 focus:border-wing-rose focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear mobile search"
              className="absolute right-3 text-wing-zinc-400 hover:text-white"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
