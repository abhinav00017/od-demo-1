"use client";

import { Calendar, MapPin, QrCode, Ticket, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { formatINR, site, type BookingRecord } from "./data";
import { DialogBackdrop, SlidePanel } from "./Motion";

interface BookingsDrawerProps {
  onClose: () => void;
  bookings: BookingRecord[];
}

/** "My Passes": every pass booked in this visit, newest first. Held in page state only. */
export function BookingsDrawer({ onClose, bookings }: BookingsDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);

  return (
    <DialogBackdrop labelledBy="my-passes-title" className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm">
      <div className="flex-1" onClick={onClose} aria-hidden="true" />

      <SlidePanel className="relative flex h-full w-full max-w-md flex-col justify-between overflow-y-auto border-l border-white/10 bg-wing-panel p-6 shadow-2xl">
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <Ticket aria-hidden className="h-5 w-5 text-wing-amber" />
              <h2 id="my-passes-title" className="text-xl font-bold text-white">
                My Passes & QR Wallet
              </h2>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close My Passes drawer"
              className="rounded-full bg-white/5 p-2 text-wing-zinc-400 hover:bg-white/15 hover:text-white"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          </div>

          {bookings.length === 0 ? (
            <div className="space-y-3 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-wing-zinc-400">
                <QrCode aria-hidden className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-white">No Active Passes Yet</h3>
              <p className="mx-auto max-w-xs text-xs leading-relaxed text-wing-zinc-400">
                Select any concert, comedy special, or club night to book instant M-Tickets with QR gate entry.
              </p>
            </div>
          ) : (
            <ul className="space-y-4" aria-label="Booked passes">
              {bookings.map((b) => (
                <li key={b.bookingId} className="space-y-3 rounded-2xl border border-white/15 bg-white/[0.04] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-semibold text-wing-emerald-400 tabular-nums">{b.bookingId} · VERIFIED PASS</span>
                      <h3 className="mt-0.5 text-base font-bold text-white">{b.eventTitle}</h3>
                    </div>
                    <div className="shrink-0 rounded-lg bg-white p-2 text-black">
                      <QrCode aria-label={`QR pass ${b.bookingId}`} role="img" className="h-8 w-8" />
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-wing-zinc-300">
                    <div className="flex items-center gap-1.5">
                      <Calendar aria-hidden className="h-3.5 w-3.5 text-wing-rose" />
                      <span>
                        {b.dateSlot} · {b.timeSlot}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin aria-hidden className="h-3.5 w-3.5 text-wing-orchid" />
                      <span>
                        {b.venue}, {b.city}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-2 text-xs">
                    <span className="text-wing-zinc-400">{b.items.map((i) => `${i.quantity}x ${i.tierName}`).join(", ")}</span>
                    <span className="shrink-0 font-bold text-wing-amber tabular-nums">{formatINR(b.totalPaid)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-white/10 pt-4 text-center text-[11px] text-wing-zinc-500">
          {site.name} Encrypted M-Ticket Wallet · Show QR at Venue Gate
        </div>
      </SlidePanel>
    </DialogBackdrop>
  );
}
