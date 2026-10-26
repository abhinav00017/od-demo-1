"use client";

import { Calendar, CheckCircle2, Clock, MapPin, Minus, Navigation, Plus, QrCode, ShieldAlert, Sparkles, Tag, Users, X } from "lucide-react";
import Image from "next/image";
import { Fragment, useEffect, useRef, useState, type FormEvent } from "react";
import {
  WHATSAPP_DISPLAY,
  calculateCartTotals,
  checkoutError,
  formatINR,
  newBookingId,
  posterGradient,
  timeNowLabel,
  type BookingRecord,
  type EventItem,
} from "./data";
import { DialogBackdrop, SlidePanel } from "./Motion";

interface EventDetailDrawerProps {
  event: EventItem;
  onClose: () => void;
  onCompleteBooking: (booking: BookingRecord) => void;
}

const FIELD =
  "rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-white placeholder:text-wing-zinc-500 focus:border-wing-rose focus:outline-none";

/**
 * The event drawer: date and slot, ticket tiers, lineup, venue, then checkout. Checkout makes a QR pass in the browser
 * and adds it to "My Passes". Nothing is charged, sent or stored. The parent keys this by event, so state starts fresh.
 */
export function EventDetailDrawer({ event, onClose, onCompleteBooking }: EventDetailDrawerProps) {
  const [selectedDate, setSelectedDate] = useState(event.dateSlots[0] || event.dateLabel);
  const [selectedTime, setSelectedTime] = useState(event.timeSlots[0] || event.timeLabel);
  // One ticket of the first tier is picked already, so the visitor sees the total straight away.
  const [quantities, setQuantities] = useState<Record<string, number>>(() => (event.tiers[0] ? { [event.tiers[0].id]: 1 } : {}));
  const [promoCode, setPromoCode] = useState("");
  const [attendeeName, setAttendeeName] = useState("Aarav Sharma");
  const [attendeeEmail, setAttendeeEmail] = useState("aarav.sharma@example.com");
  const [attendeePhone, setAttendeePhone] = useState(WHATSAPP_DISPLAY);
  const [error, setError] = useState("");
  const [confirmedBooking, setConfirmedBooking] = useState<BookingRecord | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => closeRef.current?.focus(), []);

  const cart = calculateCartTotals(event.tiers, quantities, promoCode);

  const handleUpdateQty = (tierId: string, delta: number, maxAvailable: number) => {
    setError("");
    setQuantities((prev) => {
      const current = prev[tierId] || 0;
      return { ...prev, [tierId]: Math.max(0, Math.min(10, maxAvailable, current + delta)) };
    });
  };

  const handleConfirmBooking = (e: FormEvent) => {
    e.preventDefault();
    const problem = checkoutError(cart.totalTickets, { name: attendeeName, email: attendeeEmail, phone: attendeePhone });
    if (problem) {
      setError(problem);
      return;
    }

    const items = event.tiers
      .filter((t) => (quantities[t.id] || 0) > 0)
      .map((t) => ({ tierName: t.name, quantity: quantities[t.id], unitPrice: t.price }));

    // Made in the click handler, never during render, so server and browser HTML always match.
    const booking: BookingRecord = {
      bookingId: newBookingId(),
      eventId: event.id,
      eventTitle: event.title,
      venue: event.venue,
      city: event.city,
      dateSlot: selectedDate,
      timeSlot: selectedTime,
      items,
      totalPaid: cart.grandTotal,
      bookedAt: timeNowLabel(),
      attendeeName: attendeeName.trim(),
      attendeeEmail: attendeeEmail.trim(),
      attendeePhone: attendeePhone.trim(),
    };

    setConfirmedBooking(booking);
    onCompleteBooking(booking);
  };

  return (
    <DialogBackdrop labelledBy="drawer-event-title" className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm">
      <div className="flex-1" onClick={onClose} aria-hidden="true" />

      <SlidePanel className="relative flex h-full w-full max-w-2xl flex-col justify-between overflow-y-auto border-l border-white/10 bg-wing-panel shadow-2xl">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-wing-panel/90 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-xs text-wing-zinc-400">
            <span className="font-semibold text-wing-amber">{event.category}</span>
            <span aria-hidden="true">·</span>
            <span>{event.city}</span>
            <span aria-hidden="true">·</span>
            <span>{event.duration}</span>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close event details drawer"
            className="cursor-pointer rounded-full bg-white/5 p-2 text-wing-zinc-300 transition-colors hover:bg-white/15 hover:text-white"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-8 p-6">
          <div
            className="relative h-56 overflow-hidden rounded-2xl border border-white/10 sm:h-64"
            style={{ backgroundImage: posterGradient(event.poster) }}
          >
            <Image src={event.image} alt={event.title} fill sizes="(min-width: 672px) 624px, 100vw" className="object-cover opacity-65" />
            <div className="absolute inset-0 bg-linear-to-t from-wing-panel via-wing-panel/40 to-transparent" />
            <div className="absolute inset-x-5 bottom-4">
              <div className="text-xs tracking-wider text-wing-amber-400 uppercase tabular-nums">{event.posterTagline}</div>
              <h2 id="drawer-event-title" className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">
                {event.title}
              </h2>
              <p className="mt-1 text-xs text-wing-zinc-300 sm:text-sm">{event.subtitle}</p>
            </div>
          </div>

          {confirmedBooking ? (
            <div role="status" className="space-y-6 rounded-2xl border border-wing-emerald-500/30 bg-wing-emerald-950/25 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 aria-hidden className="h-8 w-8 shrink-0 text-wing-emerald-400" />
                  <div>
                    <h3 className="text-xl font-bold text-white">Booking Confirmed!</h3>
                    <p className="text-xs text-wing-zinc-300">
                      Order ID <span className="font-semibold text-wing-emerald-400 tabular-nums">{confirmedBooking.bookingId}</span> sent to{" "}
                      {confirmedBooking.attendeeEmail}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 rounded-xl bg-white p-3 text-black">
                  <QrCode aria-label="QR pass" role="img" className="h-12 w-12" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-xs">
                <div>
                  <span className="text-wing-zinc-400">Date & Slot</span>
                  <div className="mt-0.5 font-semibold text-white">
                    {confirmedBooking.dateSlot} · {confirmedBooking.timeSlot}
                  </div>
                </div>
                <div>
                  <span className="text-wing-zinc-400">Venue</span>
                  <div className="mt-0.5 font-semibold text-white">
                    {confirmedBooking.venue}, {confirmedBooking.city}
                  </div>
                </div>
              </div>

              <div className="space-y-2 border-t border-white/10 pt-4">
                <div className="text-xs font-semibold text-wing-zinc-300">Issued Passes</div>
                {confirmedBooking.items.map((item) => (
                  <div key={item.tierName} className="flex items-center justify-between text-sm text-wing-zinc-200">
                    <span>
                      {item.quantity}x {item.tierName}
                    </span>
                    <span className="tabular-nums">{formatINR(item.quantity * item.unitPrice)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-white/10 pt-2 text-base font-bold text-wing-amber">
                  <span>Total Amount Paid</span>
                  <span className="tabular-nums">{formatINR(confirmedBooking.totalPaid)}</span>
                </div>
                <p className="pt-1 text-[11px] text-wing-zinc-400">Demo checkout: no payment was taken and nothing was sent.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmedBooking(null)}
                  className="rounded-xl bg-white/10 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-white/15"
                >
                  Book More Tickets
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-wing-rose px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-wing-rose-light"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: date and entry slot */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-base font-bold text-white">
                    <Calendar aria-hidden className="h-4 w-4 text-wing-rose" />
                    <span>1. Select Date & Entry Slot</span>
                  </h3>
                  <span className="text-xs text-wing-zinc-400">{event.language}</span>
                </div>

                <div className="flex flex-wrap gap-2.5" role="group" aria-label="Date">
                  {event.dateSlots.map((slot) => {
                    const active = slot === selectedDate;
                    return (
                      <button
                        key={slot}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setSelectedDate(slot)}
                        className={`cursor-pointer rounded-xl border px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                          active
                            ? "border-wing-rose bg-wing-rose text-white shadow-md shadow-wing-rose/25"
                            : "border-white/10 bg-white/[0.04] text-wing-zinc-300 hover:bg-white/[0.08]"
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-2.5" role="group" aria-label="Entry slot">
                  {event.timeSlots.map((slot) => {
                    const active = slot === selectedTime;
                    return (
                      <button
                        key={slot}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setSelectedTime(slot)}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-all ${
                          active ? "border-wing-violet bg-wing-violet/25 text-white" : "border-white/10 bg-white/[0.03] text-wing-zinc-400 hover:text-wing-zinc-200"
                        }`}
                      >
                        <Clock aria-hidden className="h-3.5 w-3.5 text-wing-orchid" />
                        <span>{slot}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: ticket tiers with + / - steppers */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-base font-bold text-white">
                    <Sparkles aria-hidden className="h-4 w-4 text-wing-amber" />
                    <span>2. Choose Ticket Tiers</span>
                  </h3>
                  <span className="text-xs text-wing-zinc-400">Instant QR Gate Entry</span>
                </div>

                <div className="space-y-3">
                  {event.tiers.map((tier) => {
                    const qty = quantities[tier.id] || 0;
                    return (
                      <div
                        key={tier.id}
                        className={`rounded-2xl border p-4 transition-all ${
                          qty > 0 ? "border-wing-rose/60 bg-white/[0.07]" : "border-white/10 bg-white/[0.03] hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-wing-display text-sm font-bold text-white sm:text-base">{tier.name}</span>
                              {tier.badge && <span className="text-[11px] font-semibold text-wing-amber">· {tier.badge}</span>}
                            </div>
                            <p className="text-xs leading-relaxed text-wing-zinc-400">{tier.description}</p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-[11px] text-wing-zinc-300">
                              {tier.perks.map((perk, idx) => (
                                <Fragment key={perk}>
                                  {idx > 0 && <span aria-hidden="true">·</span>}
                                  <span>{perk}</span>
                                </Fragment>
                              ))}
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-2.5">
                            <div className="text-base font-bold text-wing-amber tabular-nums sm:text-lg">{formatINR(tier.price)}</div>
                            <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-wing-night p-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(tier.id, -1, tier.availableCount)}
                                disabled={qty === 0}
                                aria-label={`Decrease quantity for ${tier.name}`}
                                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-wing-zinc-300 transition-colors hover:bg-white/10 disabled:opacity-30"
                              >
                                <Minus aria-hidden className="h-3.5 w-3.5" />
                              </button>
                              <span aria-live="polite" className="w-6 text-center text-sm font-bold text-white tabular-nums">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(tier.id, 1, tier.availableCount)}
                                aria-label={`Increase quantity for ${tier.name}`}
                                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-wing-rose text-white transition-colors hover:bg-wing-rose-light"
                              >
                                <Plus aria-hidden className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lineup */}
              <div className="space-y-3 border-t border-white/10 pt-2">
                <h3 className="flex items-center gap-2 text-base font-bold text-white">
                  <Users aria-hidden className="h-4 w-4 text-wing-orchid" />
                  <span>Artist & Performance Lineup</span>
                </h3>
                <p className="text-xs leading-relaxed text-wing-zinc-300 sm:text-sm">{event.description}</p>
                <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                  {event.lineup.map((artist) => (
                    <div key={artist.name} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <Image
                        src={artist.avatar}
                        alt={artist.name}
                        width={44}
                        height={44}
                        className="h-11 w-11 shrink-0 rounded-full border border-white/15 object-cover"
                      />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-white">{artist.name}</div>
                        <div className="truncate text-xs text-wing-zinc-400">{artist.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Venue and terms */}
              <div className="grid grid-cols-1 gap-4 border-t border-white/10 pt-2 sm:grid-cols-2">
                <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                      <MapPin aria-hidden className="h-3.5 w-3.5 text-wing-rose" />
                      Venue & Location
                    </span>
                    <span className="text-[11px] text-wing-zinc-400">{event.mapCoordinates.area}</span>
                  </div>
                  <div className="text-xs font-medium text-wing-zinc-200">{event.venue}</div>
                  <p className="text-[11px] leading-relaxed text-wing-zinc-400">{event.address}</p>
                  <div className="flex items-center justify-between pt-2 text-[11px] text-wing-orchid tabular-nums">
                    <span>
                      {event.mapCoordinates.lat.toFixed(4)}° N, {event.mapCoordinates.lng.toFixed(4)}° E
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Navigation aria-hidden className="h-3 w-3" />
                      Valet Available
                    </span>
                  </div>
                </div>

                <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <ShieldAlert aria-hidden className="h-3.5 w-3.5 text-wing-amber" />
                    Terms & Age Limit ({event.ageLimit})
                  </div>
                  <ul className="space-y-1.5 text-[11px] leading-relaxed text-wing-zinc-400">
                    <li>• Carry a valid government photo ID (DigiLocker / Physical).</li>
                    <li>• Smart casual or club attire mandatory for nightlife venues.</li>
                    <li>• QR code grants one-time tamper-proof gate verification.</li>
                  </ul>
                </div>
              </div>

              {/* Promo code and attendee details */}
              <form
                id="ticket-checkout-form"
                aria-label="Checkout"
                noValidate
                onSubmit={handleConfirmBooking}
                className="space-y-4 border-t border-white/10 pt-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Tag aria-hidden className="absolute top-3 left-3.5 h-3.5 w-3.5 text-wing-zinc-400" />
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Promo Code (Try SALSA10 or VIP500)"
                      aria-label="Promo Code"
                      className={`w-full pl-9 ${FIELD}`}
                    />
                  </div>
                  {cart.discountAmount > 0 && (
                    <span className="shrink-0 text-xs text-wing-emerald-400 tabular-nums">-{formatINR(cart.discountAmount)} Applied!</span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <input
                    type="text"
                    autoComplete="name"
                    value={attendeeName}
                    onChange={(e) => {
                      setAttendeeName(e.target.value);
                      setError("");
                    }}
                    placeholder="Full Name"
                    aria-label="Attendee Full Name"
                    className={FIELD}
                  />
                  <input
                    type="email"
                    autoComplete="email"
                    value={attendeeEmail}
                    onChange={(e) => {
                      setAttendeeEmail(e.target.value);
                      setError("");
                    }}
                    placeholder="Email for M-Ticket"
                    aria-label="Attendee Email"
                    className={FIELD}
                  />
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={attendeePhone}
                    onChange={(e) => {
                      setAttendeePhone(e.target.value);
                      setError("");
                    }}
                    placeholder="WhatsApp Number"
                    aria-label="Attendee WhatsApp Number"
                    className={FIELD}
                  />
                </div>

                {error && (
                  <p role="alert" className="text-xs font-medium text-wing-rose-soft">
                    {error}
                  </p>
                )}
              </form>
            </>
          )}
        </div>

        {!confirmedBooking && (
          <div className="sticky bottom-0 z-30 flex flex-col justify-between gap-4 border-t border-white/15 bg-wing-night/95 p-5 backdrop-blur-xl sm:flex-row sm:items-center">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs text-wing-zinc-400">
                <span>{cart.totalTickets} Ticket(s)</span>
                {cart.bookingFee > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>+{formatINR(cart.bookingFee + cart.gstAmount)} Booking & GST</span>
                  </>
                )}
              </div>
              <div className="text-2xl font-extrabold text-wing-amber tabular-nums">{cart.totalTickets > 0 ? formatINR(cart.grandTotal) : "₹0"}</div>
            </div>

            <button
              type="submit"
              form="ticket-checkout-form"
              className="cursor-pointer rounded-xl bg-linear-to-r from-wing-rose to-wing-violet px-6 py-3.5 text-sm font-semibold whitespace-nowrap text-white shadow-lg shadow-wing-rose/25 transition-all hover:from-wing-rose-light hover:to-wing-violet-light"
            >
              {cart.totalTickets > 0 ? `Proceed to Checkout · ${formatINR(cart.grandTotal)}` : "Select Tickets Above"}
            </button>
          </div>
        )}
      </SlidePanel>
    </DialogBackdrop>
  );
}
