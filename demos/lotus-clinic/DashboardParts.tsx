"use client";

import { Eye, EyeOff } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useState } from "react";
import { SOURCE_LABELS, type BookingSource } from "@/lib/bookings/sources";
import type { BookingStatus, DashboardBooking, WhatsAppSummary } from "@/lib/bookings/types";
import { formatPhone, maskPhone } from "./dashboardData";

export const STATUS_STYLE: Record<BookingStatus, { label: string; className: string }> = {
  new: { label: "New", className: "bg-lotus-text text-white" },
  confirmed: { label: "Confirmed", className: "bg-lotus-accent text-white" },
  visited: { label: "Visited", className: "bg-lotus-avatar text-lotus-accent-hover" },
  no_show: { label: "No-show", className: "bg-white text-lotus-error ring-1 ring-lotus-error" },
  cancelled: { label: "Cancelled", className: "bg-white text-lotus-muted ring-1 ring-lotus-hairline" },
};

/** The status chip. A status change cross-fades it. */
export function StatusChip({ status }: { status: BookingStatus }) {
  const style = STATUS_STYLE[status];
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <m.span
        key={status}
        data-status={status}
        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.className}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {style.label}
      </m.span>
    </AnimatePresence>
  );
}

/** Where the booking came from: a quiet hairline chip. The campaign shows on hover. */
export function SourceChip({ source, campaign }: { source: BookingSource; campaign?: string | null }) {
  return (
    <span
      data-source={source}
      title={campaign ? `Campaign: ${campaign}` : undefined}
      className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-lotus-muted ring-1 ring-lotus-hairline"
    >
      {SOURCE_LABELS[source]}
    </span>
  );
}

/** The phone, masked until tapped. */
export function Phone({ phone, name }: { phone: string; name: string }) {
  const [shown, setShown] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setShown((s) => !s)}
      aria-label={shown ? `Hide ${name}'s number` : `Show ${name}'s full number`}
      className="inline-flex items-center gap-1.5 rounded-lg py-1 font-mono text-sm text-lotus-text tabular-nums hover:text-lotus-accent"
    >
      {shown ? formatPhone(phone) : maskPhone(phone)}
      {shown ? <EyeOff aria-hidden strokeWidth={1.75} className="size-4" /> : <Eye aria-hidden strokeWidth={1.75} className="size-4" />}
    </button>
  );
}

/** "8:51 pm", in clinic time. */
function clinicTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

/** The "(set TWILIO_CONTENT_SID_*, ...)" hint at the end of a Twilio no-session error. */
const HINT_AT_END = /\s*\((set TWILIO_CONTENT_SID_\*[^()]*)\)$/;

/** Splits a stored error into the reason and its hint, so the hint survives the row's 60-char cut. */
export function splitHint(error: string | null | undefined): { reason: string; hint: string | null } {
  const text = (error ?? "").trim();
  const match = HINT_AT_END.exec(text);
  return match ? { reason: text.slice(0, match.index), hint: match[1] } : { reason: text, hint: null };
}

/** "Thu, 12 Nov, Evening" from a day and a slot. */
function shortWhen(date: string, slot: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const day = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : date;
  return `${day}, ${slot.split(",")[0]}`;
}

/**
 * "WhatsApp: sent 8:51 pm", "WhatsApp reminder: delivered 6:02 pm", "WhatsApp visit moved: read 9:52 am",
 * "WhatsApp: failed: <reason>", "Patient confirmed on WhatsApp", or "WhatsApp: skipped (opted out)" when nothing went out.
 * Never a provider name.
 */
export function whatsappLine(w: WhatsAppSummary) {
  if (w.kind === "patient_confirmed") return "Patient confirmed on WhatsApp";
  const label = w.kind === "confirmation" ? "WhatsApp" : `WhatsApp ${w.kind.replaceAll("_", " ")}`;
  if (w.skipped) return `${label}: skipped (${w.skipReason ?? "demo"})`;
  if (w.status === "failed") {
    const reason = splitHint(w.error).reason || "unknown error";
    return `${label}: failed: ${reason.length > 60 ? `${reason.slice(0, 59)}…` : reason}`;
  }
  return `${label}: ${w.status} ${clinicTime(w.at)}`;
}

export function WhatsAppStatus({ w }: { w: WhatsAppSummary }) {
  const hint = w.status === "failed" ? splitHint(w.error).hint : null;
  return (
    <>
      <p suppressHydrationWarning className={`mt-1 text-sm ${w.status === "failed" ? "font-semibold text-lotus-error" : "text-lotus-muted"}`} title={w.error ?? undefined}>
        {whatsappLine(w)}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-lotus-muted">Hint: {hint}</p> : null}
    </>
  );
}

const AMBER = "rounded-full bg-lotus-warn-soft px-2.5 py-0.5 text-xs font-semibold text-lotus-warn ring-1 ring-lotus-warn-line";
const QUIET = "rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-lotus-text ring-1 ring-lotus-hairline";

/**
 * The state chips on a booking: "Wants a new time" (with the day and slot the patient asked for), "Waiting for patient",
 * "No WhatsApp. Call to confirm." (amber, until confirmed by phone) and "Confirmed by phone".
 */
export function BookingFlags({ b }: { b: Pick<DashboardBooking, "status" | "wantsNewTime" | "requestedDate" | "requestedSlot" | "awaitingPatient" | "noWhatsApp" | "phoneConfirmedAt"> }) {
  const open = b.status === "new" || b.status === "confirmed";
  return (
    <>
      {b.wantsNewTime ? (
        <span data-flag="wants-new-time" className={AMBER}>
          Wants a new time{b.requestedDate && b.requestedSlot ? `: ${shortWhen(b.requestedDate, b.requestedSlot)}` : ""}
        </span>
      ) : null}
      {b.awaitingPatient && open ? (
        <span data-flag="awaiting-patient" className={QUIET}>
          Waiting for patient
        </span>
      ) : null}
      {b.noWhatsApp && open && !b.phoneConfirmedAt ? (
        <span data-flag="no-whatsapp" className={AMBER}>
          No WhatsApp. Call to confirm.
        </span>
      ) : null}
      {b.phoneConfirmedAt && open ? (
        <span data-flag="phone-confirmed" className={QUIET}>
          Confirmed by phone
        </span>
      ) : null}
    </>
  );
}

/** The WhatsApp line on a row: "WhatsApp: opted out" when the patient sent STOP, else the latest message. */
export function WhatsAppRowLine({ b }: { b: Pick<DashboardBooking, "whatsapp" | "optedOut"> }) {
  if (b.optedOut) {
    return (
      <p data-opted-out="" className="mt-1 text-sm font-semibold text-lotus-text">
        WhatsApp: opted out
      </p>
    );
  }
  return b.whatsapp ? <WhatsAppStatus w={b.whatsapp} /> : null;
}

/** "WhatsApp consent: website, 10 Nov 2026, 10:42" (clinic time), or "No WhatsApp consent". */
export function consentLine(b: Pick<DashboardBooking, "consentAt" | "consentSource">) {
  if (!b.consentAt || !b.consentSource) return "No WhatsApp consent";
  const at = new Date(b.consentAt);
  const day = at.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
  const time = at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
  return `WhatsApp consent: ${b.consentSource}, ${day}, ${time}`;
}
