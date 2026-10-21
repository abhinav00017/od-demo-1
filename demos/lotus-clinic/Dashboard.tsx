"use client";

import { CalendarX2, Check, Eye, EyeOff, LogOut, X } from "lucide-react";
import { useState } from "react";
import type { BookingStatus, DashboardBooking, WhatsAppSummary } from "@/lib/bookings/types";
import type { QrPath } from "@/lib/qr";
import type { WhatsAppOptIn } from "@/lib/whatsapp/optin";
import { dashboardCounts, dayLabel, formatPhone, groupByDay, maskPhone } from "./dashboardData";
import { ui } from "./ui";

const STATUS_STYLE: Record<BookingStatus, { label: string; className: string }> = {
  new: { label: "New", className: "bg-lotus-text text-white" },
  confirmed: { label: "Confirmed", className: "bg-lotus-accent text-white" },
  cancelled: { label: "Cancelled", className: "bg-white text-lotus-muted ring-1 ring-lotus-hairline" },
};

export type DashboardProps = {
  bookings: DashboardBooking[];
  /** YYYY-MM-DD in clinic time, from the API. */
  today: string;
  storage?: "memory" | "postgres";
  live: boolean;
  updatedAt?: Date;
  busyId?: string;
  bookHref: string;
  onStatus: (id: string, status: BookingStatus) => void;
  onLogout: () => void;
  /** The join link and its QR, drawn on the server. Null or missing = no join step, no panel. */
  optIn?: DeskOptIn | null;
};

export type DeskOptIn = WhatsAppOptIn & { qr: QrPath };

function Phone({ phone, name }: { phone: string; name: string }) {
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
  const m = HINT_AT_END.exec(text);
  return m ? { reason: text.slice(0, m.index), hint: m[1] } : { reason: text, hint: null };
}

/** "WhatsApp: sent 8:51 pm", "WhatsApp reminder: delivered 6:02 pm", "WhatsApp: failed: <reason>". */
export function whatsappLine(w: WhatsAppSummary) {
  const label = w.kind === "confirmation" ? "WhatsApp" : `WhatsApp ${w.kind.replace("_", " ")}`;
  if (w.status === "failed") {
    const reason = splitHint(w.error).reason || "unknown error";
    return `${label}: failed: ${reason.length > 60 ? `${reason.slice(0, 59)}…` : reason}`;
  }
  return `${label}: ${w.status} ${clinicTime(w.at)}`;
}

/** Small grey note after the line. Only Twilio gets one: Meta is the default, and fake only runs locally. */
export function providerNote(w: WhatsAppSummary) {
  return w.provider === "twilio" ? "via Twilio" : null;
}

function WhatsAppStatus({ w }: { w: WhatsAppSummary }) {
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

/** The front-desk QR: patients scan it to send the join message, so the clinic can reach them on WhatsApp. */
export function DeskQr({ optIn }: { optIn: DeskOptIn }) {
  const { qr } = optIn;
  return (
    <section aria-labelledby="whatsapp-optin" className={`mt-4 grid gap-5 p-6 sm:mt-6 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8 sm:p-7 ${ui.card}`}>
      <div className="justify-self-start rounded-2xl bg-white p-2 ring-1 ring-lotus-hairline">
        <svg
          role="img"
          aria-label="QR code that opens WhatsApp with the join message"
          viewBox={`0 0 ${qr.size} ${qr.size}`}
          shapeRendering="crispEdges"
          className="size-40 bg-white text-lotus-text sm:size-36"
        >
          <rect width={qr.size} height={qr.size} fill="#fff" />
          <path d={qr.d} fill="currentColor" />
        </svg>
      </div>
      <div className="min-w-0">
        <h2 id="whatsapp-optin" className="text-xl font-semibold tracking-tight text-lotus-text">
          WhatsApp opt-in
        </h2>
        <p className="mt-1.5">Patients scan this at the desk to get updates on WhatsApp.</p>
        <p className="mt-3 text-sm">
          They send <code className="rounded-lg bg-lotus-wash px-2 py-0.5 font-mono text-[13px] font-semibold text-lotus-text">join {optIn.keyword}</code> to{" "}
          <span className="font-semibold whitespace-nowrap text-lotus-text tabular-nums">{optIn.displayNumber}</span>.
        </p>
        <p className="mt-2 text-sm">
          Link:{" "}
          <a href={optIn.href} target="_blank" rel="noopener" className="font-mono text-[13px] font-semibold break-all text-lotus-accent underline-offset-4 hover:underline">
            {optIn.href}
          </a>
        </p>
      </div>
    </section>
  );
}

function Row({ b, busy, onStatus }: { b: DashboardBooking; busy: boolean; onStatus: DashboardProps["onStatus"] }) {
  const [part, time] = b.slot.split(", ");
  const status = STATUS_STYLE[b.status];
  return (
    <li className="grid gap-3 rounded-2xl bg-white p-5 shadow-lotus ring-1 ring-lotus-hairline sm:grid-cols-[9rem_1fr_auto] sm:items-center sm:gap-6">
      <div>
        <p className="font-semibold text-lotus-text">{part}</p>
        {time ? <p className="text-sm">{time}</p> : null}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`font-semibold text-lotus-text ${b.status === "cancelled" ? "line-through" : ""}`}>{b.name}</p>
          <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-lotus-text ring-1 ring-lotus-hairline">
            {b.visitType === "online" ? "Online" : "Clinic"}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.className}`}>{status.label}</span>
        </div>
        <p className="mt-1 text-sm">{b.reason}</p>
        <Phone phone={b.phone} name={b.name} />
        {b.whatsapp ? <WhatsAppStatus w={b.whatsapp} /> : null}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || b.status === "confirmed"}
          onClick={() => onStatus(b.id, "confirmed")}
          aria-label={`Confirm ${b.name}`}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-lotus-accent px-4 text-sm font-semibold text-white transition hover:bg-lotus-accent-hover disabled:cursor-not-allowed disabled:bg-lotus-wash disabled:text-lotus-text"
        >
          <Check aria-hidden strokeWidth={2} className="size-4" />
          Confirm
        </button>
        <button
          type="button"
          disabled={busy || b.status === "cancelled"}
          onClick={() => onStatus(b.id, "cancelled")}
          aria-label={`Cancel ${b.name}`}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-lotus-error ring-1 ring-lotus-hairline transition hover:ring-lotus-error disabled:cursor-not-allowed disabled:text-lotus-muted"
        >
          <X aria-hidden strokeWidth={2} className="size-4" />
          Cancel
        </button>
      </div>
    </li>
  );
}

export function LiveDot({ live, updatedAt }: { live: boolean; updatedAt?: Date }) {
  return (
    <p className="flex items-center gap-2 text-sm" aria-live="polite">
      <span aria-hidden className="relative flex size-2.5">
        <span className={`relative inline-flex size-2.5 rounded-full ${live ? "bg-lotus-accent ring-4 ring-lotus-accent/15" : "bg-lotus-field"}`} />
      </span>
      <span className="font-semibold text-lotus-text">{live ? "Live" : "Reconnecting"}</span>
      {updatedAt ? (
        <span suppressHydrationWarning>
          · updated {updatedAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
        </span>
      ) : null}
    </p>
  );
}

/** The bookings view. Pure: data in, callbacks out. AdminApp feeds it. */
export function Dashboard({ bookings, today, storage, live, updatedAt, busyId, bookHref, onStatus, onLogout, optIn }: DashboardProps) {
  const counts = dashboardCounts(bookings, today);
  const groups = groupByDay(bookings);
  const tiles = [
    { label: "Today", value: counts.today },
    { label: "This week", value: counts.week },
    { label: "New", value: counts.fresh },
  ];
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <LiveDot live={live} updatedAt={updatedAt} />
        <button type="button" onClick={onLogout} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-lotus-text ring-1 ring-lotus-hairline transition hover:text-lotus-accent hover:ring-lotus-accent">
          <LogOut aria-hidden strokeWidth={1.75} className="size-4" />
          Log out
        </button>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3 sm:gap-5">
        {tiles.map((t) => (
          <div key={t.label} className={`p-4 sm:p-6 ${ui.card}`}>
            <dt className="text-sm">{t.label}</dt>
            <dd className="mt-1 text-3xl font-bold tracking-tight text-lotus-text sm:text-4xl">{t.value}</dd>
          </div>
        ))}
      </dl>

      {optIn ? <DeskQr optIn={optIn} /> : null}

      {storage === "memory" ? (
        <p className="mt-4 rounded-2xl bg-lotus-wash p-4 text-sm text-lotus-text">
          Test storage: no database is connected, so bookings live in server memory and vanish when it restarts.
        </p>
      ) : null}

      {groups.length === 0 ? (
        <div className={`mt-6 px-6 py-12 text-center ${ui.card}`}>
          <span aria-hidden className="mx-auto flex size-12 items-center justify-center rounded-full ring-1 ring-lotus-hairline">
            <CalendarX2 strokeWidth={1.5} className="size-6 text-lotus-accent" />
          </span>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-lotus-text">No bookings yet</h2>
          <p className="mx-auto mt-1.5 max-w-md">New requests from the booking page show up here within 5 seconds.</p>
          <a href={bookHref} target="_blank" rel="noopener" className={`mt-5 ${ui.primary}`}>
            Open the booking page
          </a>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {groups.map((g) => (
            <section key={g.day} aria-labelledby={`day-${g.day}`}>
              <h2 id={`day-${g.day}`} className="flex items-baseline gap-3 text-xl font-semibold tracking-tight text-lotus-text">
                {dayLabel(g.day, today)}
                <span className="text-sm font-normal text-lotus-muted">
                  {g.items.length} {g.items.length === 1 ? "booking" : "bookings"}
                </span>
              </h2>
              <ul className="mt-4 space-y-3">
                {g.items.map((b) => (
                  <Row key={b.id} b={b} busy={busyId === b.id} onStatus={onStatus} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
