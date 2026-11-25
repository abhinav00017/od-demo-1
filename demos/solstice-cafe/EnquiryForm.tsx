"use client";

import { Check, Send } from "lucide-react";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { addDays, enquirySchema, fieldErrors, HONEYPOT, indiaToday } from "@/lib/cafeEvents/validation";
import { EVENT_TYPES, MAX_DAYS_AHEAD, eventTypeLabel, slotLabel, type Venue } from "./events";
import { cafeAttribution } from "./attribution";
import { MagneticButton } from "./MagneticButton";

const subscribeNothing = () => () => undefined;

/** Today in India. Empty on the server and during hydration, so the static HTML matches. */
function useToday() {
  return useSyncExternalStore(subscribeNothing, () => indiaToday(), () => "");
}

const FIELD = "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-sol-ink focus:border-sol-sage focus:outline-none";
const LABEL = "mb-1.5 block text-xs font-medium text-sol-stone-700";

type Fields = { eventType: string; date: string; slot: string; guests: string; name: string; phone: string; notes: string };
type Sent = { reference: string; fields: Fields };

/** Order of the fields on screen, so the first error gets focus. */
const ORDER: (keyof Fields)[] = ["eventType", "date", "slot", "guests", "name", "phone", "notes"];

/**
 * The enquiry form on a venue page. Checks everything in the browser with the same schema the API uses, then saves
 * the enquiry through /api/cafe/enquiries. The visitor gets a thank-you with a reference; the owner sees it in the list.
 */
export function EnquiryForm({ venue }: { venue: Venue }) {
  const today = useToday();
  const id = useId();
  const [f, setF] = useState<Fields>({ eventType: "", date: "", slot: "", guests: "", name: "", phone: "", notes: "" });
  const [hp, setHp] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const thanks = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (sent) thanks.current?.focus();
  }, [sent]);

  const set = (key: keyof Fields) => (value: string) => {
    setF((prev) => ({ ...prev, [key]: value }));
    if (errors[key])
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
  };

  const fid = (key: string) => `${id}-${key}`;
  const err = (key: keyof Fields) =>
    errors[key] ? (
      <p id={`${fid(key)}-error`} className="mt-1.5 text-xs text-sol-error">
        {errors[key]}
      </p>
    ) : null;
  const a11y = (key: keyof Fields) => ({
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `${fid(key)}-error` : undefined,
  });

  const focusFirst = (found: Record<string, string>) => {
    const first = ORDER.find((k) => found[k]);
    if (first) form.current?.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus();
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setFormError("");
    const body = { venue: venue.id, ...f, guests: f.guests.trim() === "" ? undefined : Number(f.guests), [HONEYPOT]: hp };
    const day = today || indiaToday();
    const parsed = enquirySchema(venue, day).safeParse(body);
    if (!parsed.success) {
      const found = fieldErrors(parsed.error);
      setErrors(found);
      focusFirst(found);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const res = await fetch("/api/cafe/enquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, ...(cafeAttribution() ?? {}) }) });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; reference?: string; error?: string; fieldErrors?: Record<string, string> };
      if (res.ok && data.ok && data.reference) {
        setSent({ reference: data.reference, fields: f });
      } else if (data.fieldErrors) {
        setErrors(data.fieldErrors);
        focusFirst(data.fieldErrors);
      } else {
        setFormError(data.error ?? "We could not send your enquiry. Please try again.");
      }
    } catch {
      setFormError("We could not reach the cafe. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    const s = sent.fields;
    return (
      <div role="status" className="rounded-xl border border-sol-sage/30 bg-white p-6">
        <h3 ref={thanks} tabIndex={-1} className="flex items-center gap-2 text-base font-semibold text-sol-sage focus:outline-none">
          <Check aria-hidden className="h-5 w-5" />
          <span>Thank you. Your enquiry is with us.</span>
        </h3>
        <p className="mt-3 text-sm text-sol-stone-600">
          Your reference is <strong className="font-sol-mono text-sol-ink tabular-nums">{sent.reference}</strong>.
        </p>
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 border-t border-sol-stone-100 pt-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-sol-stone-500">Venue</dt>
            <dd className="text-sol-ink">{venue.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-sol-stone-500">Event</dt>
            <dd className="text-sol-ink">{eventTypeLabel(s.eventType)}</dd>
          </div>
          <div>
            <dt className="text-xs text-sol-stone-500">Date and time</dt>
            <dd className="text-sol-ink">
              <span className="font-sol-mono tabular-nums">{s.date}</span> · {slotLabel(venue, s.slot)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-sol-stone-500">Guests</dt>
            <dd className="font-sol-mono text-sol-ink tabular-nums">{s.guests}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm leading-relaxed text-sol-stone-600">
          Our events team will call you on <span className="font-sol-mono tabular-nums">{s.phone.trim()}</span> to talk it through and
          confirm the final quote. Nothing is booked or charged until then.
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(null);
            setF((prev) => ({ ...prev, notes: "" }));
          }}
          className="mt-4 cursor-pointer text-xs font-medium text-sol-sage underline underline-offset-4"
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <form ref={form} onSubmit={submit} noValidate aria-label={`Enquiry for ${venue.name}`} className="space-y-5">
      <fieldset>
        <legend className={LABEL}>Type of event</legend>
        <div className="grid grid-cols-2 gap-2">
          {EVENT_TYPES.map((t, i) => (
            <label
              key={t.id}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border bg-white px-3 py-2.5 text-sm has-checked:border-sol-sage has-checked:bg-sol-sage/5 has-focus-visible:ring-2 has-focus-visible:ring-sol-sage ${
                errors.eventType ? "border-sol-error" : "border-sol-stone-300"
              }`}
            >
              <input
                type="radio"
                name={`${id}-eventType`}
                value={t.id}
                checked={f.eventType === t.id}
                onChange={() => set("eventType")(t.id)}
                data-field={i === 0 ? "eventType" : undefined}
                {...a11y("eventType")}
                className="accent-sol-sage"
              />
              <span>{t.label}</span>
            </label>
          ))}
        </div>
        {err("eventType")}
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={fid("date")} className={LABEL}>
            Date
          </label>
          <input
            id={fid("date")}
            data-field="date"
            type="date"
            value={f.date}
            min={today || undefined}
            max={today ? addDays(today, MAX_DAYS_AHEAD) : undefined}
            onChange={(e) => set("date")(e.target.value)}
            required
            {...a11y("date")}
            className={`${FIELD} font-sol-mono tabular-nums ${errors.date ? "border-sol-error" : "border-sol-stone-300"}`}
          />
          {err("date")}
        </div>

        <div>
          <label htmlFor={fid("guests")} className={LABEL}>
            Number of guests ({venue.minGuests} to {venue.maxGuests})
          </label>
          <input
            id={fid("guests")}
            data-field="guests"
            type="number"
            inputMode="numeric"
            min={venue.minGuests}
            max={venue.maxGuests}
            step={1}
            placeholder={String(venue.minGuests)}
            value={f.guests}
            onChange={(e) => set("guests")(e.target.value)}
            required
            {...a11y("guests")}
            className={`${FIELD} font-sol-mono tabular-nums ${errors.guests ? "border-sol-error" : "border-sol-stone-300"}`}
          />
          {err("guests")}
        </div>
      </div>

      <fieldset>
        <legend className={LABEL}>Time</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {venue.slots.map((s, i) => (
            <label
              key={s.id}
              className={`flex cursor-pointer items-start gap-2 rounded-lg border bg-white px-3 py-2.5 text-sm has-checked:border-sol-sage has-checked:bg-sol-sage/5 has-focus-visible:ring-2 has-focus-visible:ring-sol-sage ${
                errors.slot ? "border-sol-error" : "border-sol-stone-300"
              }`}
            >
              <input
                type="radio"
                name={`${id}-slot`}
                value={s.id}
                checked={f.slot === s.id}
                onChange={() => set("slot")(s.id)}
                data-field={i === 0 ? "slot" : undefined}
                {...a11y("slot")}
                className="mt-0.5 accent-sol-sage"
              />
              <span>
                <span className="block font-medium text-sol-ink">{s.label}</span>
                <span className="block font-sol-mono text-xs text-sol-stone-600 tabular-nums">{s.time}</span>
              </span>
            </label>
          ))}
        </div>
        {err("slot")}
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={fid("name")} className={LABEL}>
            Your name
          </label>
          <input
            id={fid("name")}
            data-field="name"
            type="text"
            autoComplete="name"
            value={f.name}
            onChange={(e) => set("name")(e.target.value)}
            required
            maxLength={80}
            {...a11y("name")}
            className={`${FIELD} ${errors.name ? "border-sol-error" : "border-sol-stone-300"}`}
          />
          {err("name")}
        </div>
        <div>
          <label htmlFor={fid("phone")} className={LABEL}>
            Mobile number
          </label>
          <input
            id={fid("phone")}
            data-field="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="98765 43210"
            value={f.phone}
            onChange={(e) => set("phone")(e.target.value)}
            required
            {...a11y("phone")}
            className={`${FIELD} font-sol-mono tabular-nums ${errors.phone ? "border-sol-error" : "border-sol-stone-300"}`}
          />
          {err("phone")}
        </div>
      </div>

      <div>
        <label htmlFor={fid("notes")} className={LABEL}>
          Notes <span className="font-normal text-sol-stone-500">(optional)</span>
        </label>
        <textarea
          id={fid("notes")}
          data-field="notes"
          rows={3}
          maxLength={500}
          placeholder="Theme, food preferences, a cake, anything we should know."
          value={f.notes}
          onChange={(e) => set("notes")(e.target.value)}
          {...a11y("notes")}
          className={`${FIELD} resize-y ${errors.notes ? "border-sol-error" : "border-sol-stone-300"}`}
        />
        {err("notes")}
      </div>

      {/* Hidden from people and screen readers. Bots that fill every field fill this one too. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={fid(HONEYPOT)}>Company</label>
        <input id={fid(HONEYPOT)} type="text" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
      </div>

      {formError ? (
        <p role="alert" className="rounded-lg border border-sol-error/30 bg-white p-3 text-sm text-sol-error">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <MagneticButton
          type="submit"
          className="w-full cursor-pointer gap-2 rounded-lg bg-sol-sage px-6 py-3 text-sm font-medium text-white hover:bg-sol-sage-deep disabled:opacity-60 sm:w-auto"
        >
          <Send aria-hidden className="h-4 w-4" />
          <span>{busy ? "Sending…" : "Send enquiry"}</span>
        </MagneticButton>
        <p className="text-xs text-sol-stone-500">No payment now. The cafe confirms the final quote.</p>
      </div>
    </form>
  );
}
