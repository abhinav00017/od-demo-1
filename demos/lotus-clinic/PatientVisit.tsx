"use client";

import { CalendarPlus, CalendarClock, MapPin, Navigation, Phone, Video, XCircle } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import type { PublicVisit } from "@/lib/bookings/publicVisit";
import { MAX_DAYS_AHEAD, parseDay } from "./booking";
import { clinic } from "./data";
import { visitIcs } from "./visitCalendar";
import { ui } from "./ui";

type View =
  | { kind: "loading" }
  | { kind: "ok"; visit: PublicVisit; today: string }
  | { kind: "expired" }
  | { kind: "invalid" }
  | { kind: "error"; message: string };

const clinicTel = `tel:${clinic.phone.replace(/[^\d+]/g, "")}`;
const directions = `https://maps.google.com/?q=${encodeURIComponent(clinic.mapQuery)}`;

/** "Thursday, 12 November" from YYYY-MM-DD. */
function longDate(day: string) {
  const d = parseDay(day);
  return d ? d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }) : day;
}

function addDays(day: string, n: number) {
  const d = parseDay(day);
  if (!d) return day;
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <section className="border-b border-lotus-hairline bg-lotus-tint">
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-16">{children}</div>
    </section>
  );
}

function CallClinic({ title, line }: { title: string; line: string }) {
  return (
    <Shell>
      <div data-patient-visit="" className={`p-6 sm:p-8 ${ui.card}`}>
        <h1 className={`text-3xl sm:text-4xl ${ui.h1}`}>{title}</h1>
        <p className="mt-3 text-lg">{line}</p>
        <a href={clinicTel} className={`mt-6 w-full sm:w-auto ${ui.primary}`}>
          <Phone aria-hidden strokeWidth={1.75} className="size-5" />
          Call {clinic.phone}
        </a>
      </div>
    </Shell>
  );
}

/**
 * The patient's own page: the visit, the address with directions, Add to calendar, Change day or slot, and Cancel.
 * Reads the token from the URL and asks /api/bookings/view/<token>. Shows no name, phone, reason or notes.
 */
export function PatientVisit() {
  const { token } = useParams<{ token: string }>();
  const [view, setView] = useState<View>({ kind: "loading" });

  useEffect(() => {
    let live = true;
    fetch(`/api/bookings/view/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; visit?: PublicVisit; today?: string; error?: string };
        if (!live) return;
        if (res.ok && data.ok && data.visit && data.today) setView({ kind: "ok", visit: data.visit, today: data.today });
        else if (res.status === 410) setView({ kind: "expired" });
        else if (res.status === 404) setView({ kind: "invalid" });
        else setView({ kind: "error", message: data.error ?? "Could not load your visit. Please try again." });
      })
      .catch(() => live && setView({ kind: "error", message: "Could not reach the clinic. Check your connection and try again." }));
    return () => {
      live = false;
    };
  }, [token]);

  switch (view.kind) {
    case "loading":
      return <p className="py-24 text-center">Loading your visit…</p>;
    case "expired":
      return <CallClinic title="This link has expired" line="The visit day has passed. To book again or ask anything, call the clinic." />;
    case "invalid":
      return <CallClinic title="This link is not valid" line="Check the link in your WhatsApp message, or call the clinic." />;
    case "error":
      return <CallClinic title="Something went wrong" line={view.message} />;
    case "ok":
      return <VisitCard token={token} visit={view.visit} today={view.today} onChange={(visit) => setView({ ...view, visit })} />;
  }
}

type Step = "idle" | "change" | "cancel";

function VisitCard({ token, visit, today, onChange }: { token: string; visit: PublicVisit; today: string; onChange: (v: PublicVisit) => void }) {
  const id = useId();
  const [step, setStep] = useState<Step>("idle");
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState(visit.date);
  const [slot, setSlot] = useState(visit.slot);
  const online = visit.visitType === "online";
  const typeLabel = clinic.booking.visitTypes.find((t) => t.id === visit.visitType)?.label ?? "Visit";
  const open = visit.status === "new" || visit.status === "confirmed";

  async function send(body: Record<string, unknown>, success: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/bookings/view/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; visit?: PublicVisit; error?: string };
      if (res.ok && data.ok && data.visit) {
        onChange(data.visit);
        setStep("idle");
        setDone(success);
      } else setError(data.error ?? "Could not save that. Please try again.");
    } catch {
      setError("Could not reach the clinic. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  function addToCalendar() {
    const blob = new Blob([visitIcs(visit)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lotus-visit-${visit.date}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function submitChange(e: FormEvent) {
    e.preventDefault();
    void send({ action: "change", date, slot }, "Request sent. The clinic will confirm the new time on WhatsApp.");
  }

  let note: string | null = null;
  if (visit.status === "cancelled") note = "This visit is cancelled.";
  else if (visit.wantsNewTime && visit.requestedDate && visit.requestedSlot) note = `You asked for ${longDate(visit.requestedDate)}, ${visit.requestedSlot}. The clinic will confirm on WhatsApp.`;
  else if (visit.wantsNewTime) note = "You asked for another time. The clinic will confirm on WhatsApp.";
  else if (visit.status === "new") note = "The clinic will confirm this visit on WhatsApp.";
  else if (visit.awaitingPatient) note = "The clinic moved your visit to this time. Tap Confirm in WhatsApp if it suits you.";

  const pill = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 font-semibold transition";
  const plain = `${pill} bg-white text-lotus-text ring-1 ring-lotus-hairline hover:text-lotus-accent hover:ring-lotus-accent`;

  return (
    <Shell>
      <div data-patient-visit="" className={`p-6 sm:p-8 ${ui.card}`}>
        <p className="text-sm font-semibold text-lotus-accent-hover">{clinic.name}</p>
        <h1 className={`mt-1 text-3xl sm:text-4xl ${ui.h1}`}>Your visit</h1>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-lotus-tint p-4">
            <dt className="text-sm">Day</dt>
            <dd className={`mt-0.5 text-lg font-semibold text-lotus-text ${visit.status === "cancelled" ? "line-through" : ""}`}>{longDate(visit.date)}</dd>
          </div>
          <div className="rounded-2xl bg-lotus-tint p-4">
            <dt className="text-sm">Time</dt>
            <dd className="mt-0.5 text-lg font-semibold text-lotus-text">{visit.slot}</dd>
            <dd className="text-sm">Come any time in this window.</dd>
          </div>
          <div className="rounded-2xl bg-lotus-tint p-4 sm:col-span-2">
            <dt className="text-sm">Visit type</dt>
            <dd className="mt-0.5 font-semibold text-lotus-text">{typeLabel}</dd>
          </div>
        </dl>

        {note ? (
          <p role="status" className="mt-5 rounded-2xl bg-white p-4 font-semibold text-lotus-text ring-1 ring-lotus-hairline">
            {note}
          </p>
        ) : null}
        {done ? (
          <p role="status" data-patient-done="" className="mt-3 rounded-2xl bg-lotus-tint p-4 font-semibold text-lotus-text ring-1 ring-lotus-hairline">
            {done}
          </p>
        ) : null}

        <div className="mt-6 border-t border-lotus-hairline pt-5">
          {online ? (
            <p className="flex gap-3">
              <Video aria-hidden strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-lotus-accent" />
              <span>Video or phone call from home. The clinic sends the call link on WhatsApp.</span>
            </p>
          ) : (
            <div className="flex gap-3">
              <MapPin aria-hidden strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-lotus-accent" />
              <div>
                <p className="text-lotus-text">{clinic.address.join(", ")}</p>
                <a href={directions} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 font-semibold text-lotus-accent underline-offset-4 hover:underline">
                  <Navigation aria-hidden strokeWidth={1.75} className="size-4" />
                  Get directions
                </a>
              </div>
            </div>
          )}
        </div>

        {open ? (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button type="button" onClick={addToCalendar} className={`${ui.primary} min-h-12`}>
              <CalendarPlus aria-hidden strokeWidth={1.75} className="size-5" />
              Add to calendar
            </button>
            <button type="button" aria-expanded={step === "change"} onClick={() => setStep(step === "change" ? "idle" : "change")} className={plain}>
              <CalendarClock aria-hidden strokeWidth={1.75} className="size-5" />
              Change day or slot
            </button>
            <button type="button" aria-expanded={step === "cancel"} onClick={() => setStep(step === "cancel" ? "idle" : "cancel")} className={`${pill} bg-white text-lotus-error ring-1 ring-lotus-hairline hover:ring-lotus-error`}>
              <XCircle aria-hidden strokeWidth={1.75} className="size-5" />
              Cancel visit
            </button>
          </div>
        ) : (
          <a href={clinicTel} className={`mt-6 w-full sm:w-auto ${plain}`}>
            <Phone aria-hidden strokeWidth={1.75} className="size-5" />
            Call {clinic.phone}
          </a>
        )}

        {step === "change" && open ? (
          <form onSubmit={submitChange} aria-label="Change day or slot" className="mt-5 grid gap-4 rounded-2xl p-4 ring-1 ring-lotus-hairline sm:grid-cols-2 sm:p-5">
            <div>
              <label htmlFor={`${id}-date`} className="font-medium text-lotus-text">
                New day
              </label>
              <input id={`${id}-date`} type="date" min={today} max={addDays(today, MAX_DAYS_AHEAD)} value={date} onChange={(e) => setDate(e.target.value)} className={ui.input} />
            </div>
            <div>
              <label htmlFor={`${id}-slot`} className="font-medium text-lotus-text">
                Time of day
              </label>
              <select id={`${id}-slot`} value={slot} onChange={(e) => setSlot(e.target.value)} className={ui.input}>
                {clinic.booking.slots.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <p className="text-sm sm:col-span-2">The clinic checks the new time and confirms on WhatsApp.</p>
            <div className="sm:col-span-2">
              <button type="submit" disabled={busy || !date} className={`w-full sm:w-auto disabled:cursor-wait ${ui.primary}`}>
                {busy ? "Sending…" : "Send request"}
              </button>
            </div>
          </form>
        ) : null}

        {step === "cancel" && open ? (
          <div role="group" aria-label="Cancel visit" className="mt-5 rounded-2xl p-4 ring-1 ring-lotus-error sm:p-5">
            <p className="font-semibold text-lotus-text">Cancel this visit?</p>
            <p className="mt-1 text-sm">To book again later, use the booking page or call the clinic.</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={busy}
                onClick={() => void send({ action: "cancel" }, "Your visit is cancelled.")}
                className={`${pill} bg-lotus-error text-white disabled:cursor-wait disabled:opacity-70`}
              >
                {busy ? "Cancelling…" : "Yes, cancel visit"}
              </button>
              <button type="button" disabled={busy} onClick={() => setStep("idle")} className={plain}>
                Keep visit
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="mt-4 text-sm font-semibold text-lotus-error">
            {error}
          </p>
        ) : null}

        <p className="mt-8 border-t border-lotus-hairline pt-5 text-sm">
          Questions? Call or WhatsApp the clinic on{" "}
          <a href={clinicTel} className="font-semibold whitespace-nowrap text-lotus-text tabular-nums underline-offset-4 hover:underline">
            {clinic.phone}
          </a>
          .
        </p>
      </div>
    </Shell>
  );
}
