"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { SOURCE_LABELS, STAFF_SOURCES, type BookingSource } from "@/lib/bookings/sources";
import type { DashboardBooking } from "@/lib/bookings/types";
import type { AdminApi, StaffBookingInput } from "./adminApi";
import { clinic } from "./data";
import { ui } from "./ui";

const field = "mt-1.5 block min-h-11 w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-base text-lotus-text ring-1 ring-lotus-field focus:ring-2 focus:ring-lotus-accent focus:outline-none aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-lotus-error";

function Labelled({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-lotus-text">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-err`} className="mt-1 text-sm font-semibold text-lotus-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const submitClass = `w-full sm:w-auto disabled:cursor-not-allowed disabled:bg-lotus-wash disabled:text-lotus-text ${ui.primary}`;

/**
 * The staff New booking form: name, phone, date, slot, visit type, reason and where it came from.
 * Saves as confirmed. WhatsApp only when "Send confirmation on WhatsApp" is ticked (off by default).
 */
export function NewBookingForm({ api, today, onDone }: { api: AdminApi; today: string; onDone: (b: DashboardBooking) => void }) {
  const id = useId();
  const [values, setValues] = useState<StaffBookingInput>({
    name: "",
    phone: "",
    date: today,
    slot: clinic.booking.slots[0],
    visitType: "clinic",
    reason: clinic.booking.reasons[0],
    source: "walk_in",
    sendWhatsApp: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof StaffBookingInput>(key: K, value: StaffBookingInput[K]) => setValues((v) => ({ ...v, [key]: value }));
  const a11y = (name: string) => ({ "aria-invalid": errors[name] ? true : undefined, "aria-describedby": errors[name] ? `${id}-${name}-err` : undefined });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api.createBooking(values);
      if (result.ok) onDone(result.booking);
      else {
        setErrors(result.fieldErrors ?? {});
        setError(result.error);
      }
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} aria-label="New booking" className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Labelled id={`${id}-name`} label="Name" error={errors.name}>
          <input id={`${id}-name`} value={values.name} onChange={(e) => set("name", e.target.value)} autoComplete="off" className={field} {...a11y("name")} />
        </Labelled>
      </div>
      <Labelled id={`${id}-phone`} label="Mobile number" error={errors.phone}>
        <input id={`${id}-phone`} type="tel" inputMode="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="off" className={field} {...a11y("phone")} />
      </Labelled>
      <Labelled id={`${id}-date`} label="Date" error={errors.date}>
        <input id={`${id}-date`} type="date" min={today} value={values.date} onChange={(e) => set("date", e.target.value)} className={field} {...a11y("date")} />
      </Labelled>
      <Labelled id={`${id}-slot`} label="Time" error={errors.slot}>
        <select id={`${id}-slot`} value={values.slot} onChange={(e) => set("slot", e.target.value)} className={field} {...a11y("slot")}>
          {clinic.booking.slots.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Labelled>
      <Labelled id={`${id}-type`} label="Visit type" error={errors.visitType}>
        <select id={`${id}-type`} value={values.visitType} onChange={(e) => set("visitType", e.target.value)} className={field} {...a11y("visitType")}>
          {clinic.booking.visitTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </Labelled>
      <Labelled id={`${id}-reason`} label="Reason" error={errors.reason}>
        <select id={`${id}-reason`} value={values.reason} onChange={(e) => set("reason", e.target.value)} className={field} {...a11y("reason")}>
          {clinic.booking.reasons.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </Labelled>
      <Labelled id={`${id}-source`} label="Source" error={errors.source}>
        <select id={`${id}-source`} value={values.source} onChange={(e) => set("source", e.target.value as BookingSource)} className={field} {...a11y("source")}>
          {STAFF_SOURCES.map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABELS[s]}
            </option>
          ))}
        </select>
      </Labelled>
      <label className="flex items-start gap-3 text-sm text-lotus-text sm:col-span-2">
        <input type="checkbox" checked={values.sendWhatsApp} onChange={(e) => set("sendWhatsApp", e.target.checked)} className="mt-0.5 size-5 accent-lotus-accent" />
        <span>
          Send confirmation on WhatsApp
          <span className="block text-lotus-muted">Off by default. The booking is saved as confirmed either way.</span>
        </span>
      </label>
      {error ? (
        <p role="alert" className="text-sm font-semibold text-lotus-error sm:col-span-2">
          {error}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <button type="submit" disabled={busy || values.name.trim().length < 2 || !values.phone.trim()} className={submitClass}>
          {busy ? "Saving…" : "Save booking"}
        </button>
      </div>
    </form>
  );
}

/** Picks a new day and slot for a patient who asked for a new time. */
export function RescheduleForm({
  booking,
  today,
  onSave,
}: {
  booking: Pick<DashboardBooking, "name" | "date" | "slot">;
  today: string;
  onSave: (date: string, slot: string) => Promise<string | null>;
}) {
  const id = useId();
  const [date, setDate] = useState(booking.date < today ? today : booking.date);
  const [slot, setSlot] = useState(booking.slot);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const problem = await onSave(date, slot);
    setBusy(false);
    if (problem) setError(problem);
  }

  return (
    <form onSubmit={submit} aria-label={`Reschedule ${booking.name}`} className="grid gap-4 sm:grid-cols-2">
      <p className="text-sm sm:col-span-2">The visit moves to the new time, is confirmed, and the patient gets a WhatsApp confirmation.</p>
      <Labelled id={`${id}-date`} label="New date">
        <input id={`${id}-date`} type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className={field} />
      </Labelled>
      <Labelled id={`${id}-slot`} label="New time">
        <select id={`${id}-slot`} value={slot} onChange={(e) => setSlot(e.target.value)} className={field}>
          {clinic.booking.slots.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Labelled>
      {error ? (
        <p role="alert" className="text-sm font-semibold text-lotus-error sm:col-span-2">
          {error}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <button type="submit" disabled={busy || !date} className={submitClass}>
          {busy ? "Saving…" : "Reschedule and confirm"}
        </button>
      </div>
    </form>
  );
}
