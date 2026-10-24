"use client";

import { Calendar, Check, Sun } from "lucide-react";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import {
  PARTY_SIZES,
  RESERVATION_TIMES,
  reservationErrors,
  reservationMessage,
  whatsAppHref,
  type Reservation,
} from "./data";
import { MagneticButton } from "./MagneticButton";

const subscribeNothing = () => () => undefined;

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Today as YYYY-MM-DD in the visitor's time zone. Empty on the server and during hydration, so the static HTML matches. */
function useToday() {
  return useSyncExternalStore(subscribeNothing, localToday, () => "");
}

const FIELD = "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm focus:border-sol-sage focus:outline-none";

/**
 * The courtyard table form. Checks the date and mobile number in the browser, then opens WhatsApp with the request
 * to the demo number. Nothing is sent to a server or stored.
 */
export function ReservationForm() {
  const today = useToday();
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState(RESERVATION_TIMES[1].value);
  const [guests, setGuests] = useState(PARTY_SIZES[1].value);
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof Reservation, string>>>({});
  const [sentHref, setSentHref] = useState<string | null>(null);

  const reservation: Reservation = { date: date ?? today, time, guests, phone };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const found = reservationErrors(reservation, today);
    setErrors(found);
    if (Object.keys(found).length) return;
    const href = whatsAppHref(reservationMessage(reservation));
    window.open(href, "_blank", "noopener,noreferrer");
    setSentHref(href);
  };

  return (
    <div id="reserve" className="scroll-mt-24 rounded-2xl border border-sol-stone-200/90 bg-sol-paper p-8 lg:col-span-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-sol-display text-2xl font-normal text-sol-ink">Reserve a Sunlit Courtyard Table</h3>
          <p className="mt-1 text-xs text-sol-stone-500">Confirmed on WhatsApp · No advance deposit required</p>
        </div>
        <Sun aria-hidden className="h-5 w-5 text-sol-terra" />
      </div>

      {sentHref ? (
        <div role="status" className="mt-6 rounded-xl border border-sol-sage/30 bg-white p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-sol-sage">
            <Check aria-hidden className="h-4 w-4" />
            <span>Reservation Request Ready on WhatsApp</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-sol-stone-600">
            Your request for <strong>{reservation.guests}</strong> on <span className="font-sol-mono tabular-nums">{reservation.date}</span> at{" "}
            <span className="font-sol-mono tabular-nums">{reservation.time}</span> is typed into WhatsApp. Send the message and the
            Solstice team confirms your table on <span className="font-sol-mono tabular-nums">{reservation.phone.trim()}</span>.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <a
              href={sentHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-sol-sage underline underline-offset-4"
            >
              Open WhatsApp again
            </a>
            <button
              type="button"
              onClick={() => setSentHref(null)}
              className="cursor-pointer text-xs font-medium text-sol-sage underline underline-offset-4"
            >
              Modify Reservation
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="res-date" className="mb-1.5 block text-xs font-medium text-sol-stone-700">
                Date
              </label>
              <input
                id="res-date"
                type="date"
                value={reservation.date}
                min={today || undefined}
                onChange={(e) => setDate(e.target.value)}
                required
                aria-invalid={errors.date ? true : undefined}
                aria-describedby={errors.date ? "res-date-error" : undefined}
                className={`${FIELD} font-sol-mono tabular-nums ${errors.date ? "border-sol-error" : "border-sol-stone-300"}`}
              />
              {errors.date ? (
                <p id="res-date-error" className="mt-1.5 text-xs text-sol-error">
                  {errors.date}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="res-time" className="mb-1.5 block text-xs font-medium text-sol-stone-700">
                Preferred Time
              </label>
              <select id="res-time" value={time} onChange={(e) => setTime(e.target.value)} className={`${FIELD} border-sol-stone-300`}>
                {RESERVATION_TIMES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="res-guests" className="mb-1.5 block text-xs font-medium text-sol-stone-700">
                Party Size
              </label>
              <select id="res-guests" value={guests} onChange={(e) => setGuests(e.target.value)} className={`${FIELD} border-sol-stone-300`}>
                {PARTY_SIZES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="res-phone" className="mb-1.5 block text-xs font-medium text-sol-stone-700">
                Mobile Number (for WhatsApp Pass)
              </label>
              <input
                id="res-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+91 98490 00000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                aria-invalid={errors.phone ? true : undefined}
                aria-describedby={errors.phone ? "res-phone-error" : undefined}
                className={`${FIELD} font-sol-mono tabular-nums ${errors.phone ? "border-sol-error" : "border-sol-stone-300"}`}
              />
              {errors.phone ? (
                <p id="res-phone-error" className="mt-1.5 text-xs text-sol-error">
                  {errors.phone}
                </p>
              ) : null}
            </div>
          </div>

          <div className="pt-2">
            <MagneticButton
              type="submit"
              className="w-full cursor-pointer gap-2 rounded-lg bg-sol-sage px-6 py-3 text-sm font-medium text-white hover:bg-sol-sage-deep sm:w-auto"
            >
              <Calendar aria-hidden className="h-4 w-4" />
              <span>Confirm Courtyard Table</span>
            </MagneticButton>
          </div>
        </form>
      )}
    </div>
  );
}
