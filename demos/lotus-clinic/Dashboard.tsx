"use client";

import { CalendarX2, Check, Eye, EyeOff, LogOut, X } from "lucide-react";
import { useState } from "react";
import type { Booking, BookingStatus } from "@/lib/bookings/types";
import { dashboardCounts, dayLabel, formatPhone, groupByDay, maskPhone } from "./dashboardData";

const STATUS_STYLE: Record<BookingStatus, { label: string; className: string }> = {
  new: { label: "New", className: "bg-lotus-sand text-lotus-ink" },
  confirmed: { label: "Confirmed", className: "bg-lotus-mint text-lotus-teal-deep" },
  cancelled: { label: "Cancelled", className: "bg-white text-lotus-body ring-1 ring-lotus-line" },
};

export type DashboardProps = {
  bookings: Booking[];
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
      className="inline-flex items-center gap-1.5 rounded-lg py-1 font-mono text-sm text-lotus-ink tabular-nums hover:text-lotus-teal"
    >
      {shown ? formatPhone(phone) : maskPhone(phone)}
      {shown ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
    </button>
  );
}

function Row({ b, busy, onStatus }: { b: Booking; busy: boolean; onStatus: DashboardProps["onStatus"] }) {
  const [part, time] = b.slot.split(", ");
  const status = STATUS_STYLE[b.status];
  return (
    <li className="grid gap-3 rounded-2xl bg-white p-5 ring-1 ring-lotus-line sm:grid-cols-[9rem_1fr_auto] sm:items-center sm:gap-6">
      <div>
        <p className="font-semibold text-lotus-ink">{part}</p>
        {time ? <p className="text-sm">{time}</p> : null}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`font-semibold text-lotus-ink ${b.status === "cancelled" ? "line-through" : ""}`}>{b.name}</p>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.visitType === "online" ? "bg-white text-lotus-rose ring-1 ring-lotus-rose" : "bg-white text-lotus-teal ring-1 ring-lotus-teal"}`}>
            {b.visitType === "online" ? "Online" : "Clinic"}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.className}`}>{status.label}</span>
        </div>
        <p className="mt-1 text-sm">{b.reason}</p>
        <Phone phone={b.phone} name={b.name} />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || b.status === "confirmed"}
          onClick={() => onStatus(b.id, "confirmed")}
          aria-label={`Confirm ${b.name}`}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-lotus-teal px-4 text-sm font-semibold text-white hover:bg-lotus-teal-deep disabled:cursor-not-allowed disabled:bg-lotus-mint disabled:text-lotus-teal-deep"
        >
          <Check aria-hidden className="size-4" />
          Confirm
        </button>
        <button
          type="button"
          disabled={busy || b.status === "cancelled"}
          onClick={() => onStatus(b.id, "cancelled")}
          aria-label={`Cancel ${b.name}`}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-lotus-rose ring-1 ring-lotus-line hover:ring-lotus-rose disabled:cursor-not-allowed disabled:text-lotus-body"
        >
          <X aria-hidden className="size-4" />
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
        {live ? <span className="absolute inline-flex size-full animate-ping rounded-full bg-wa-green opacity-60" /> : null}
        <span className={`relative inline-flex size-2.5 rounded-full ${live ? "bg-wa-green" : "bg-lotus-line"}`} />
      </span>
      <span className="font-semibold text-lotus-ink">{live ? "Live" : "Reconnecting"}</span>
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
        <button type="button" onClick={onLogout} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-lotus-teal ring-1 ring-lotus-line hover:ring-lotus-teal">
          <LogOut aria-hidden className="size-4" />
          Log out
        </button>
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-3 sm:gap-5">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl bg-white p-4 ring-1 ring-lotus-line sm:p-6">
            <dt className="text-sm">{t.label}</dt>
            <dd className="mt-1 font-lotus text-3xl font-semibold text-lotus-ink sm:text-4xl">{t.value}</dd>
          </div>
        ))}
      </dl>

      {storage === "memory" ? (
        <p className="mt-4 rounded-2xl bg-lotus-sand p-4 text-sm text-lotus-ink">
          Test storage: no database is connected, so bookings live in server memory and vanish when it restarts.
        </p>
      ) : null}

      {groups.length === 0 ? (
        <div className="mt-8 rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-lotus-line">
          <span aria-hidden className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-lotus-mint text-lotus-teal">
            <CalendarX2 className="size-7" />
          </span>
          <h2 className="mt-5 font-lotus text-2xl font-semibold text-lotus-ink">No bookings yet</h2>
          <p className="mx-auto mt-2 max-w-md">New requests from the booking page show up here within 5 seconds. Try one from your phone.</p>
          <a href={bookHref} target="_blank" rel="noopener" className="mt-6 inline-flex rounded-full bg-lotus-teal px-6 py-3 font-semibold text-white hover:bg-lotus-teal-deep">
            Open the booking page
          </a>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {groups.map((g) => (
            <section key={g.day} aria-labelledby={`day-${g.day}`}>
              <h2 id={`day-${g.day}`} className="flex items-baseline gap-3 font-lotus text-2xl font-semibold text-lotus-ink">
                {dayLabel(g.day, today)}
                <span className="font-sans text-sm font-normal text-lotus-body">
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
