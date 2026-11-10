"use client";

import { Eye, EyeOff } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useState } from "react";
import { SOURCE_LABELS, type BookingSource } from "@/lib/bookings/sources";
import type { BookingStatus, WhatsAppSummary } from "@/lib/bookings/types";
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

/**
 * "WhatsApp: sent 8:51 pm", "WhatsApp reminder: delivered 6:02 pm", "WhatsApp: failed: <reason>",
 * "Patient confirmed on WhatsApp", or "WhatsApp: skipped (demo)" when the booking is demo data.
 */
export function whatsappLine(w: WhatsAppSummary) {
  if (w.kind === "patient_confirmed") return "Patient confirmed on WhatsApp";
  const label = w.kind === "confirmation" ? "WhatsApp" : `WhatsApp ${w.kind.replace("_", " ")}`;
  if (w.skipped) return `${label}: skipped (demo)`;
  if (w.status === "failed") {
    const reason = splitHint(w.error).reason || "unknown error";
    return `${label}: failed: ${reason.length > 60 ? `${reason.slice(0, 59)}…` : reason}`;
  }
  return `${label}: ${w.status} ${clinicTime(w.at)}`;
}

/** Small grey note after the line. Only Twilio gets one: Meta is the default, and fake only runs locally. */
export function providerNote(w: WhatsAppSummary) {
  return w.provider === "twilio" && w.kind !== "patient_confirmed" ? "via Twilio" : null;
}

export function WhatsAppStatus({ w }: { w: WhatsAppSummary }) {
  const note = providerNote(w);
  const hint = w.status === "failed" ? splitHint(w.error).hint : null;
  return (
    <>
      <p suppressHydrationWarning className={`mt-1 text-sm ${w.status === "failed" ? "font-semibold text-lotus-error" : "text-lotus-muted"}`} title={w.error ?? undefined}>
        {whatsappLine(w)}
        {note ? <span className="ml-2 text-xs font-normal text-lotus-muted">{note}</span> : null}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-lotus-muted">Hint: {hint}</p> : null}
    </>
  );
}
