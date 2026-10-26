"use client";

import { PlusCircle, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { listingError, listingMessage, listingToEvent, whatsAppHref, type EventItem, type EventListing } from "./data";
import { DialogBackdrop, PopCard } from "./Motion";

interface ListEventModalProps {
  onClose: () => void;
  onCreateEvent: (event: EventItem) => void;
}

const LABEL = "mb-1 block text-xs font-medium text-wing-zinc-300";
const FIELD =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-wing-zinc-500 focus:border-wing-rose focus:outline-none";
const SELECT = "w-full rounded-xl border border-white/10 bg-wing-panel-raised px-3.5 py-2.5 text-sm text-white focus:border-wing-rose focus:outline-none";
const SMALL = "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white";

const CITY_OPTIONS: EventListing["city"][] = ["Mumbai", "Bengaluru", "Delhi NCR", "Hyderabad", "Goa", "Pune", "Nagpur"];
const CATEGORY_OPTIONS: EventListing["category"][] = ["Music & Gigs", "Nightlife", "Comedy", "Festivals", "Workshops", "Flea Markets"];

/**
 * "List Your Event": checks the title, venue and headliner, then opens WhatsApp to the demo number with the details,
 * and shows the event on the page straight away, as the export did. Nothing goes to a server.
 */
export function ListEventModal({ onClose, onCreateEvent }: ListEventModalProps) {
  const [listing, setListing] = useState<EventListing>({
    title: "",
    subtitle: "",
    city: "Mumbai",
    category: "Music & Gigs",
    venue: "",
    dateLabel: "31 Oct",
    timeLabel: "09:00 PM",
    startingPrice: "1499",
    artistName: "",
  });
  const [error, setError] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => closeRef.current?.focus(), []);

  const set = <K extends keyof EventListing>(key: K, value: EventListing[K]) => {
    setListing((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const problem = listingError(listing);
    if (problem) {
      setError(problem);
      return;
    }
    // Opened straight from the submit so pop-up blockers allow it.
    window.open(whatsAppHref(listingMessage(listing)), "_blank", "noopener,noreferrer");
    onCreateEvent(listingToEvent(listing, `evt-custom-${Date.now().toString(36)}`));
    onClose();
  };

  return (
    <DialogBackdrop labelledBy="list-event-modal-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <PopCard className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/15 bg-wing-panel p-6 shadow-2xl sm:p-8">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles aria-hidden className="h-5 w-5 shrink-0 text-wing-amber" />
            <h2 id="list-event-modal-title" className="text-xl font-bold text-white">
              Go Live in 5 Mins — List Your Event
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close List Your Event modal"
            className="shrink-0 rounded-full bg-white/5 p-2 text-wing-zinc-400 transition-colors hover:bg-white/15 hover:text-white"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-5">
          <div>
            <label htmlFor="new-evt-title" className={LABEL}>
              Event Title *
            </label>
            <input
              id="new-evt-title"
              type="text"
              value={listing.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g., Warehouse Underground: Mumbai Edition"
              className={FIELD}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="new-evt-city" className={LABEL}>
                City *
              </label>
              <select id="new-evt-city" value={listing.city} onChange={(e) => set("city", e.target.value as EventListing["city"])} className={SELECT}>
                {CITY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="new-evt-category" className={LABEL}>
                Category *
              </label>
              <select
                id="new-evt-category"
                value={listing.category}
                onChange={(e) => set("category", e.target.value as EventListing["category"])}
                className={SELECT}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="new-evt-venue" className={LABEL}>
                Venue Name *
              </label>
              <input
                id="new-evt-venue"
                type="text"
                value={listing.venue}
                onChange={(e) => set("venue", e.target.value)}
                placeholder="e.g., Harbour Studio, Bandra"
                className={FIELD}
              />
            </div>
            <div>
              <label htmlFor="new-evt-artist" className={LABEL}>
                Headliner Artist / Host *
              </label>
              <input
                id="new-evt-artist"
                type="text"
                value={listing.artistName}
                onChange={(e) => set("artistName", e.target.value)}
                placeholder="e.g., DJ Kairav"
                className={FIELD}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="new-evt-date" className={LABEL}>
                Date
              </label>
              <input id="new-evt-date" type="text" value={listing.dateLabel} onChange={(e) => set("dateLabel", e.target.value)} className={SMALL} />
            </div>
            <div>
              <label htmlFor="new-evt-time" className={LABEL}>
                Start Time
              </label>
              <input id="new-evt-time" type="text" value={listing.timeLabel} onChange={(e) => set("timeLabel", e.target.value)} className={SMALL} />
            </div>
            <div>
              <label htmlFor="new-evt-price" className={LABEL}>
                Early Bird (₹)
              </label>
              <input
                id="new-evt-price"
                type="number"
                min={0}
                value={listing.startingPrice}
                onChange={(e) => set("startingPrice", e.target.value)}
                className={`${SMALL} tabular-nums`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="new-evt-subtitle" className={LABEL}>
              Tagline / Subtitle (Optional)
            </label>
            <input
              id="new-evt-subtitle"
              type="text"
              value={listing.subtitle}
              onChange={(e) => set("subtitle", e.target.value)}
              placeholder="e.g., 360° Warehouse Stage · Custom Sound"
              className={`${SMALL} px-3.5 placeholder:text-wing-zinc-500`}
            />
          </div>

          {error && (
            <p role="alert" className="text-xs font-medium text-wing-rose-soft">
              {error}
            </p>
          )}

          <p className="text-[11px] text-wing-zinc-400">Publishing opens WhatsApp with your event details for our team.</p>

          <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-3">
            <button type="button" onClick={onClose} className="rounded-xl bg-white/5 px-4 py-2.5 text-xs font-medium text-wing-zinc-300 hover:bg-white/10">
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-wing-rose px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-wing-rose/25 hover:bg-wing-rose-light"
            >
              <PlusCircle aria-hidden className="h-4 w-4" />
              <span>Publish Live Event</span>
            </button>
          </div>
        </form>
      </PopCard>
    </DialogBackdrop>
  );
}
