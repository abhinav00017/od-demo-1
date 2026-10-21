"use client";

import { Eye, EyeOff, LogOut } from "lucide-react";
import { useState } from "react";
import type { BookingStatus, DashboardBooking, WhatsAppSummary } from "@/lib/bookings/types";
import { dashboardCounts, dayLabel, formatPhone, groupByDay, maskPhone } from "./dashboardData";
import { buttonClass, buttonSmallClass, panelClass } from "./ui";

const STATUS_STYLE: Record<BookingStatus, { label: string; className: string }> = {
  new: { label: "New", className: "border-lotus-forest bg-lotus-forest text-white" },
  confirmed: { label: "Confirmed", className: "border-lotus-forest text-lotus-forest" },
  cancelled: { label: "Cancelled", className: "border-lotus-rule text-lotus-grey" },
};

const pill = "rounded-md border px-2 py-0.5 text-xs font-medium";

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
};

function Phone({ phone, name }: { phone: string; name: string }) {
  const [shown, setShown] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setShown((s) => !s)}
      aria-label={shown ? `Hide ${name}'s number` : `Show ${name}'s full number`}
      className="mt-1 inline-flex items-center gap-1.5 rounded py-1 font-mono text-sm text-lotus-text tabular-nums hover:text-lotus-forest"
    >
      {shown ? formatPhone(phone) : maskPhone(phone)}
      {shown ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
    </button>
  );
}

/** "8:51 pm", in clinic time. */
function clinicTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

/** "WhatsApp: sent 8:51 pm", "WhatsApp reminder: delivered 6:02 pm", "WhatsApp: failed: <reason>". */
export function whatsappLine(w: WhatsAppSummary) {
  const label = w.kind === "confirmation" ? "WhatsApp" : `WhatsApp ${w.kind.replace("_", " ")}`;
  if (w.status === "failed") {
    const reason = (w.error ?? "unknown error").trim();
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
  return (
    <p suppressHydrationWarning className={`mt-1 text-sm ${w.status === "failed" ? "text-lotus-error" : "text-lotus-grey"}`} title={w.error ?? undefined}>
      {whatsappLine(w)}
      {note ? <span className="ml-2 text-xs text-lotus-grey">{note}</span> : null}
    </p>
  );
}

function Row({ b, busy, onStatus }: { b: DashboardBooking; busy: boolean; onStatus: DashboardProps["onStatus"] }) {
  const [part, time] = b.slot.split(", ");
  const status = STATUS_STYLE[b.status];
  return (
    <li className="grid gap-3 p-5 sm:grid-cols-[9rem_1fr_auto] sm:items-center sm:gap-6 sm:px-6">
      <div>
        <p className="font-medium text-lotus-text">{part}</p>
        {time ? <p className="text-sm tabular-nums">{time}</p> : null}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`font-medium text-lotus-text ${b.status === "cancelled" ? "line-through" : ""}`}>{b.name}</p>
          <span className={`${pill} border-lotus-edge text-lotus-text`}>{b.visitType === "online" ? "Online" : "Clinic"}</span>
          <span className={`${pill} ${status.className}`}>{status.label}</span>
        </div>
        <p className="mt-1 text-[15px]">{b.reason}</p>
        <Phone phone={b.phone} name={b.name} />
        {b.whatsapp ? <WhatsAppStatus w={b.whatsapp} /> : null}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy || b.status === "confirmed"}
          onClick={() => onStatus(b.id, "confirmed")}
          aria-label={`Confirm ${b.name}`}
          className={buttonSmallClass}
        >
          Confirm
        </button>
        <button
          type="button"
          disabled={busy || b.status === "cancelled"}
          onClick={() => onStatus(b.id, "cancelled")}
          aria-label={`Cancel ${b.name}`}
          className="inline-flex min-h-10 items-center rounded-lg px-3 text-[15px] font-medium text-lotus-error underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-lotus-grey disabled:no-underline"
        >
          Cancel
        </button>
      </div>
    </li>
  );
}

export function LiveDot({ live, updatedAt }: { live: boolean; updatedAt?: Date }) {
  return (
    <p className="flex items-center gap-2 text-sm" aria-live="polite">
      <span aria-hidden className={`size-2 rounded-full ${live ? "bg-lotus-terracotta" : "bg-lotus-edge"}`} />
      <span className="font-medium text-lotus-text">{live ? "Live" : "Reconnecting"}</span>
      {updatedAt ? (
        <span suppressHydrationWarning>
          · updated {updatedAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
        </span>
      ) : null}
    </p>
  );
}

/** The bookings view. Pure: data in, callbacks out. AdminApp feeds it. */
export function Dashboard({ bookings, today, storage, live, updatedAt, busyId, bookHref, onStatus, onLogout }: DashboardProps) {
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
        <button type="button" onClick={onLogout} className="inline-flex min-h-10 items-center gap-2 text-[15px] font-medium text-lotus-forest underline-offset-4 hover:underline">
          <LogOut aria-hidden className="size-4" />
          Log out
        </button>
      </div>

      <dl className="mt-8 grid grid-cols-3 divide-x divide-lotus-rule border-y border-lotus-rule">
        {tiles.map((t) => (
          <div key={t.label} className="py-5 pl-4 first:pl-0 sm:py-7 sm:pl-8">
            <dt className="text-sm">{t.label}</dt>
            <dd className="mt-2 font-lotus-serif text-4xl leading-none tracking-[-0.02em] text-lotus-text tabular-nums sm:text-5xl">{t.value}</dd>
          </div>
        ))}
      </dl>

      {storage === "memory" ? (
        <p className="mt-6 border-l-2 border-lotus-forest py-0.5 pl-4 text-sm text-lotus-text">
          Test storage: no database is connected, so bookings live in server memory and vanish when it restarts.
        </p>
      ) : null}

      {groups.length === 0 ? (
        <div className={`mt-10 px-6 py-16 text-center ${panelClass}`}>
          <h2 className="font-lotus-serif text-3xl tracking-[-0.02em] text-lotus-text">No bookings yet</h2>
          <p className="mx-auto mt-2 max-w-md">New requests from the booking page show up here within 5 seconds. Try one from your phone.</p>
          <a href={bookHref} target="_blank" rel="noopener" className={`mt-8 ${buttonClass}`}>
            Open the booking page
          </a>
        </div>
      ) : (
        <div className="mt-12 space-y-12">
          {groups.map((g) => (
            <section key={g.day} aria-labelledby={`day-${g.day}`}>
              <h2 id={`day-${g.day}`} className="flex items-baseline gap-3 font-lotus-serif text-[1.75rem] tracking-[-0.01em] text-lotus-text">
                {dayLabel(g.day, today)}
                <span className="font-lotus-sans text-sm text-lotus-grey">
                  {g.items.length} {g.items.length === 1 ? "booking" : "bookings"}
                </span>
              </h2>
              <ul className={`mt-4 divide-y divide-lotus-rule ${panelClass}`}>
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
