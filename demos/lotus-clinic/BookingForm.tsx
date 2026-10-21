"use client";

import { CheckCircle2, MessageCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Bubble } from "@/components/mocks/ChatMock";
import type { WhatsAppOptIn } from "@/lib/whatsapp/optin";
import { confirmationMessage, HONEYPOT_FIELD, shortBookingId, validateBooking, type BookingInput, type FieldErrors, type FieldName } from "./booking";
import { clinic } from "./data";

const EMPTY: BookingInput = { name: "", phone: "", visitType: "clinic", date: "", slot: "", reason: "", consent: false };

const ORDER: FieldName[] = ["visitType", "name", "phone", "date", "slot", "reason", "consent"];

const LABELS: Record<FieldName, string> = {
  visitType: "Type of visit",
  name: "Your name",
  phone: "Mobile number",
  date: "Preferred date",
  slot: "Time of day",
  reason: "Reason for the visit",
  consent: "WhatsApp consent",
};

const inputClass =
  "mt-2 block min-h-12 w-full rounded-xl border-0 bg-white px-4 py-3 text-base text-lotus-ink ring-1 ring-lotus-edge placeholder:text-lotus-body/80 focus:ring-2 focus:ring-lotus-teal focus:outline-none aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-lotus-rose";

function Field({ name, errors, children, hint }: { name: FieldName; errors: FieldErrors; children: ReactNode; hint?: string }) {
  return (
    <div>
      {children}
      {hint ? (
        <p id={`${name}-hint`} className="mt-1.5 text-sm">
          {hint}
        </p>
      ) : null}
      {errors[name] ? (
        <p id={`${name}-error`} className="mt-1.5 text-sm font-semibold text-lotus-rose">
          {errors[name]}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(name: FieldName, errors: FieldErrors, hint = false) {
  return [hint ? `${name}-hint` : "", errors[name] ? `${name}-error` : ""].filter(Boolean).join(" ") || undefined;
}

/** The join step for Twilio's quickstart sender: one tap opens WhatsApp with "join <keyword>" typed in. */
export function WhatsAppJoin({ optIn }: { optIn: WhatsAppOptIn }) {
  return (
    <div className="mt-6 rounded-2xl bg-lotus-mint p-5 sm:p-6">
      <h3 className="font-lotus text-2xl font-semibold text-lotus-ink">Get updates on WhatsApp</h3>
      <p className="mt-2 text-lotus-ink">Tap once to allow confirmations and reminders on WhatsApp.</p>
      <a
        href={optIn.href}
        target="_blank"
        rel="noopener"
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-lotus-teal px-6 py-3 font-semibold text-white transition hover:bg-lotus-teal-deep sm:w-auto"
      >
        <MessageCircle aria-hidden className="size-5" />
        Open WhatsApp
      </a>
      <p className="mt-3 text-sm">
        You&rsquo;ll send a short message to <span className="whitespace-nowrap">{optIn.displayNumber}</span>. That&rsquo;s it.
      </p>
    </div>
  );
}

type FormProps = {
  initialVisitType?: string;
  /** From the server page. Null or missing = no join step, nothing renders. */
  optIn?: WhatsAppOptIn | null;
};

/** Reads ?type=online in the browser. Render it inside <Suspense>: ensureStatic allows useSearchParams only there. */
export function BookingFormFromUrl({ optIn }: Pick<FormProps, "optIn">) {
  const type = useSearchParams().get("type");
  return <BookingForm key={type ?? "default"} initialVisitType={type ?? undefined} optIn={optIn} />;
}

export function BookingForm({ initialVisitType, optIn }: FormProps) {
  const start = clinic.booking.visitTypes.find((t) => t.id === initialVisitType)?.id ?? EMPTY.visitType;
  const [values, setValues] = useState<BookingInput>({ ...EMPTY, visitType: start });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [tried, setTried] = useState(false);
  const [sent, setSent] = useState<(BookingInput & { id: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [trap, setTrap] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const id = useId();

  // Set the earliest date in the browser, so the static page does not depend on build time.
  useEffect(() => {
    if (!dateRef.current) return;
    const now = new Date();
    dateRef.current.min = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }, [sent]);

  useEffect(() => {
    if (sent) doneRef.current?.focus();
  }, [sent]);

  function update<K extends FieldName>(name: K, value: BookingInput[K]) {
    const next = { ...values, [name]: value };
    setValues(next);
    if (tried) setErrors(validateBooking(next, new Date()));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    const found = validateBooking(values, new Date());
    setTried(true);
    setErrors(found);
    setSubmitError("");
    if (Object.keys(found).length) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, [HONEYPOT_FIELD]: trap }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: string; error?: string; fieldErrors?: FieldErrors };
      if (res.ok && data.ok && data.id) {
        setSent({ ...values, id: data.id });
        return;
      }
      if (data.fieldErrors && Object.keys(data.fieldErrors).length) {
        setErrors(data.fieldErrors);
        requestAnimationFrame(() => summaryRef.current?.focus());
        return;
      }
      setSubmitError(data.error ?? "We could not save your booking. Please try again.");
    } catch {
      setSubmitError("We could not reach the clinic. Check your internet connection and try again. Your details are still here.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (submitError) errorRef.current?.focus();
  }, [submitError]);

  if (sent) {
    return (
      <div ref={doneRef} tabIndex={-1} className="mx-auto max-w-2xl rounded-3xl bg-white p-6 ring-1 ring-lotus-line focus:outline-none sm:p-10">
        <CheckCircle2 aria-hidden className="size-10 text-lotus-teal" />
        <h2 className="mt-4 font-lotus text-3xl font-semibold text-lotus-ink">Request received</h2>
        <p className="mt-2 text-lg">This is the WhatsApp message {sent.name.trim().split(/\s+/)[0]} would get from the clinic:</p>
        <div className="mt-6 overflow-hidden rounded-2xl ring-1 ring-lotus-line">
          <div className="flex items-center gap-3 bg-wa-header px-4 py-3 text-white">
            <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
              L
            </span>
            <span>
              <span className="block text-sm font-semibold">{clinic.name}</span>
              <span className="block text-[11px] text-white/85">Business account</span>
            </span>
          </div>
          <div className="bg-wa-bg p-4">
            <Bubble from="business" time="now" buttons={["Confirm", "Change time"]}>
              {confirmationMessage(sent)}
            </Bubble>
          </div>
        </div>
        <p className="mt-6 font-semibold text-lotus-ink">Booking saved. The clinic will confirm on WhatsApp.</p>
        <p className="mt-1 text-sm">
          Booking id: <span className="font-mono font-semibold text-lotus-ink">{shortBookingId(sent.id)}</span>
        </p>
        {optIn ? <WhatsAppJoin optIn={optIn} /> : null}
        <p className="mt-4 text-sm">
          You&rsquo;ll get the real message on WhatsApp once the clinic confirms.{optIn ? " Tap Open WhatsApp above first." : null}
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(null);
            setValues({ ...EMPTY, visitType: start });
            setTried(false);
            setErrors({});
            setTrap("");
          }}
          className="mt-6 rounded-full px-6 py-3 font-semibold text-lotus-teal ring-2 ring-lotus-teal hover:bg-lotus-mint"
        >
          Book another visit
        </button>
      </div>
    );
  }

  const errorList = ORDER.filter((f) => errors[f]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
      <form noValidate onSubmit={onSubmit} className="relative rounded-3xl bg-white p-6 ring-1 ring-lotus-line sm:p-9" aria-label="Book a visit">
        {errorList.length ? (
          <div ref={summaryRef} tabIndex={-1} role="alert" className="mb-8 rounded-2xl bg-lotus-sand p-5 focus:outline-none">
            <p className="font-semibold text-lotus-ink">Please check {errorList.length === 1 ? "1 field" : `${errorList.length} fields`}:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {errorList.map((f) => (
                <li key={f}>
                  <a href={`#${id}-${f}`} className="font-semibold text-lotus-ink underline underline-offset-2">
                    {LABELS[f]}
                  </a>
                  : {errors[f]}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <fieldset>
          <legend className="font-semibold text-lotus-ink">{LABELS.visitType}</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {clinic.booking.visitTypes.map((t, i) => {
              const on = values.visitType === t.id;
              return (
                <label
                  key={t.id}
                  className={`flex cursor-pointer gap-3 rounded-2xl p-4 ring-1 transition ${
                    on ? "bg-lotus-mint ring-2 ring-lotus-teal" : "bg-white ring-lotus-line hover:ring-lotus-teal"
                  }`}
                >
                  <input
                    id={i === 0 ? `${id}-visitType` : undefined}
                    type="radio"
                    name="visitType"
                    value={t.id}
                    checked={on}
                    onChange={() => update("visitType", t.id)}
                    className="mt-1 size-4 accent-lotus-teal"
                  />
                  <span>
                    <span className="block font-semibold text-lotus-ink">{t.label}</span>
                    <span className="block text-sm">{t.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <Field name="name" errors={errors}>
            <label htmlFor={`${id}-name`} className="font-semibold text-lotus-ink">
              {LABELS.name}
            </label>
            <input
              id={`${id}-name`}
              name="name"
              autoComplete="name"
              value={values.name}
              onChange={(e) => update("name", e.target.value)}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={describedBy("name", errors)}
              className={inputClass}
            />
          </Field>
          <Field name="phone" errors={errors} hint="We confirm on WhatsApp.">
            <label htmlFor={`${id}-phone`} className="font-semibold text-lotus-ink">
              {LABELS.phone}
            </label>
            <input
              id={`${id}-phone`}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="98765 43210"
              value={values.phone}
              onChange={(e) => update("phone", e.target.value)}
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby={describedBy("phone", errors, true)}
              className={inputClass}
            />
          </Field>
          <Field name="date" errors={errors}>
            <label htmlFor={`${id}-date`} className="font-semibold text-lotus-ink">
              {LABELS.date}
            </label>
            <input
              ref={dateRef}
              id={`${id}-date`}
              name="date"
              type="date"
              value={values.date}
              onChange={(e) => update("date", e.target.value)}
              aria-invalid={errors.date ? true : undefined}
              aria-describedby={describedBy("date", errors)}
              className={inputClass}
            />
          </Field>
          <Field name="slot" errors={errors}>
            <label htmlFor={`${id}-slot`} className="font-semibold text-lotus-ink">
              {LABELS.slot}
            </label>
            <select
              id={`${id}-slot`}
              name="slot"
              value={values.slot}
              onChange={(e) => update("slot", e.target.value)}
              aria-invalid={errors.slot ? true : undefined}
              aria-describedby={describedBy("slot", errors)}
              className={inputClass}
            >
              <option value="">Choose a time</option>
              {clinic.booking.slots.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field name="reason" errors={errors}>
              <label htmlFor={`${id}-reason`} className="font-semibold text-lotus-ink">
                {LABELS.reason}
              </label>
              <select
                id={`${id}-reason`}
                name="reason"
                value={values.reason}
                onChange={(e) => update("reason", e.target.value)}
                aria-invalid={errors.reason ? true : undefined}
                aria-describedby={describedBy("reason", errors)}
                className={inputClass}
              >
                <option value="">Choose a reason</option>
                {clinic.booking.reasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className="mt-6">
          <Field name="consent" errors={errors}>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                id={`${id}-consent`}
                type="checkbox"
                name="consent"
                checked={values.consent}
                onChange={(e) => update("consent", e.target.checked)}
                aria-invalid={errors.consent ? true : undefined}
                aria-describedby={describedBy("consent", errors)}
                className="mt-1 size-4 accent-lotus-teal"
              />
              <span>The clinic may message me on WhatsApp about this visit.</span>
            </label>
          </Field>
        </div>

        {/* Bots fill every field. People never see this one. */}
        <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden">
          <label htmlFor={`${id}-trap`}>Leave this empty</label>
          <input id={`${id}-trap`} name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
        </div>

        {submitError ? (
          <p ref={errorRef} tabIndex={-1} role="alert" className="mt-8 rounded-2xl bg-white p-4 font-semibold text-lotus-rose ring-2 ring-lotus-rose focus:outline-none">
            {submitError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          aria-busy={saving || undefined}
          className="mt-8 w-full rounded-full bg-lotus-teal px-6 py-4 text-lg font-semibold text-white hover:bg-lotus-teal-deep disabled:cursor-wait disabled:bg-lotus-teal-deep sm:w-auto"
        >
          {saving ? "Saving your booking…" : "Request appointment"}
        </button>
      </form>

      <aside className="h-fit rounded-3xl bg-lotus-mint p-7">
        <h2 className="font-lotus text-2xl font-semibold text-lotus-ink">What happens next</h2>
        <ol className="mt-5 space-y-4">
          {[
            "We get your request at once.",
            "We confirm the exact time on WhatsApp within 2 hours.",
            "You get a reminder the day before, with directions or the call link.",
          ].map((s, i) => (
            <li key={s} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-lotus-teal text-sm font-bold text-white">{i + 1}</span>
              <span className="text-lotus-ink">{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm text-lotus-ink">
          Clinic: {clinic.hours[0].days}, {clinic.hours[0].time}. Sundays: online only.
        </p>
      </aside>
    </div>
  );
}
