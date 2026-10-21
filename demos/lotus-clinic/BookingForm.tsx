"use client";

import { CheckCircle2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Bubble } from "@/components/mocks/ChatMock";
import { confirmationMessage, HONEYPOT_FIELD, shortBookingId, validateBooking, type BookingInput, type FieldErrors, type FieldName } from "./booking";
import { clinic } from "./data";
import { buttonBusyClass, fieldClass, labelClass, panelClass, textLinkClass } from "./ui";

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

const inputClass = fieldClass;

function Field({ name, errors, children, hint }: { name: FieldName; errors: FieldErrors; children: ReactNode; hint?: string }) {
  return (
    <div>
      {children}
      {hint ? (
        <p id={`${name}-hint`} className="mt-2 text-sm">
          {hint}
        </p>
      ) : null}
      {errors[name] ? (
        <p id={`${name}-error`} className="mt-2 text-sm font-medium text-lotus-error">
          {errors[name]}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(name: FieldName, errors: FieldErrors, hint = false) {
  return [hint ? `${name}-hint` : "", errors[name] ? `${name}-error` : ""].filter(Boolean).join(" ") || undefined;
}

/** Reads ?type=online in the browser. Render it inside <Suspense>: ensureStatic allows useSearchParams only there. */
export function BookingFormFromUrl() {
  const type = useSearchParams().get("type");
  return <BookingForm key={type ?? "default"} initialVisitType={type ?? undefined} />;
}

export function BookingForm({ initialVisitType }: { initialVisitType?: string }) {
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
      <div ref={doneRef} tabIndex={-1} className={`mx-auto max-w-2xl p-6 focus:outline-none sm:p-10 ${panelClass}`}>
        <CheckCircle2 aria-hidden className="size-7 text-lotus-forest" strokeWidth={1.75} />
        <h2 className="mt-5 font-lotus-serif text-4xl tracking-[-0.02em] text-lotus-text">Request received</h2>
        <p className="mt-3 text-lg">This is the WhatsApp message {sent.name.trim().split(/\s+/)[0]} would get from the clinic:</p>
        <div className="mt-8 overflow-hidden rounded-lg border border-lotus-rule">
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
        <p className="mt-8 font-medium text-lotus-text">Booking saved. The clinic will confirm on WhatsApp.</p>
        <p className="mt-1 text-sm">
          Booking id: <span className="font-mono font-medium text-lotus-text">{shortBookingId(sent.id)}</span>
        </p>
        <p className="mt-4 text-sm">Demo: the WhatsApp message above is a preview. No message was sent.</p>
        <button
          type="button"
          onClick={() => {
            setSent(null);
            setValues({ ...EMPTY, visitType: start });
            setTried(false);
            setErrors({});
            setTrap("");
          }}
          className={`mt-8 ${textLinkClass}`}
        >
          Book another visit
        </button>
      </div>
    );
  }

  const errorList = ORDER.filter((f) => errors[f]);

  return (
    <div className="grid gap-14 lg:grid-cols-[1.7fr_1fr] lg:gap-16">
      <form noValidate onSubmit={onSubmit} className={`relative p-5 sm:p-10 ${panelClass}`} aria-label="Book a visit">
        {errorList.length ? (
          <div ref={summaryRef} tabIndex={-1} role="alert" className="mb-10 border-l-2 border-lotus-error py-1 pl-5 focus:outline-none">
            <p className="font-medium text-lotus-text">Please check {errorList.length === 1 ? "1 field" : `${errorList.length} fields`}:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {errorList.map((f) => (
                <li key={f}>
                  <a href={`#${id}-${f}`} className="font-medium text-lotus-text underline underline-offset-2">
                    {LABELS[f]}
                  </a>
                  : {errors[f]}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <fieldset>
          <legend className={labelClass}>{LABELS.visitType}</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {clinic.booking.visitTypes.map((t, i) => {
              const on = values.visitType === t.id;
              return (
                <label
                  key={t.id}
                  className={`flex cursor-pointer gap-3 rounded-lg border bg-white p-4 transition-colors ${
                    on ? "border-lotus-forest ring-1 ring-lotus-forest" : "border-lotus-rule hover:border-lotus-edge"
                  }`}
                >
                  <input
                    id={i === 0 ? `${id}-visitType` : undefined}
                    type="radio"
                    name="visitType"
                    value={t.id}
                    checked={on}
                    onChange={() => update("visitType", t.id)}
                    className="mt-1 size-4 accent-lotus-forest"
                  />
                  <span>
                    <span className="block font-medium text-lotus-text">{t.label}</span>
                    <span className="mt-0.5 block text-sm">{t.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-10 grid gap-7 sm:grid-cols-2">
          <Field name="name" errors={errors}>
            <label htmlFor={`${id}-name`} className={labelClass}>
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
            <label htmlFor={`${id}-phone`} className={labelClass}>
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
            <label htmlFor={`${id}-date`} className={labelClass}>
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
            <label htmlFor={`${id}-slot`} className={labelClass}>
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
              <label htmlFor={`${id}-reason`} className={labelClass}>
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

        <div className="mt-8">
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
                className="mt-1 size-4 accent-lotus-forest"
              />
              <span className="text-[15px] text-lotus-text">The clinic may message me on WhatsApp about this visit.</span>
            </label>
          </Field>
        </div>

        {/* Bots fill every field. People never see this one. */}
        <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden">
          <label htmlFor={`${id}-trap`}>Leave this empty</label>
          <input id={`${id}-trap`} name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
        </div>

        {submitError ? (
          <p ref={errorRef} tabIndex={-1} role="alert" className="mt-8 border-l-2 border-lotus-error py-1 pl-5 font-medium text-lotus-error focus:outline-none">
            {submitError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          aria-busy={saving || undefined}
          className={`mt-10 w-full sm:w-auto ${buttonBusyClass}`}
        >
          {saving ? "Saving your booking…" : "Request appointment"}
        </button>
      </form>

      <aside className="h-fit lg:pt-10">
        <h2 className="font-lotus-serif text-[1.75rem] tracking-[-0.01em] text-lotus-text">What happens next</h2>
        <ol className="mt-6 divide-y divide-lotus-rule border-y border-lotus-rule">
          {[
            "We get your request at once.",
            "We confirm the exact time on WhatsApp within 2 hours.",
            "You get a reminder the day before, with directions or the call link.",
          ].map((s, i) => (
            <li key={s} className="flex gap-4 py-4">
              <span className="w-4 shrink-0 font-lotus-serif text-lg leading-snug text-lotus-forest tabular-nums">{i + 1}</span>
              <span className="text-[15px] text-lotus-text">{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm">
          Clinic: {clinic.hours[0].days}, {clinic.hours[0].time}. Sundays: online only.
        </p>
      </aside>
    </div>
  );
}
