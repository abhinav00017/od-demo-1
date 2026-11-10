"use client";

import { CalendarX2, ChevronLeft, ChevronRight, LogOut, Plus, RotateCcw, Search } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useCallback, useEffect, useId, useMemo, useState, type ReactNode, type Ref } from "react";
import { BOOKING_SOURCES, SOURCE_LABELS } from "@/lib/bookings/sources";
import type { BookingStatus, DashboardBooking, PatientSummary, SourceCounts } from "@/lib/bookings/types";
import type { QrPath } from "@/lib/qr";
import type { WhatsAppOptIn } from "@/lib/whatsapp/optin";
import { AdminDialog } from "./AdminDialog";
import { httpAdminApi, type AdminApi } from "./adminApi";
import {
  adminCounts,
  callToRemind,
  remindReason,
  dayLabel,
  groupByDay,
  groupByDayNewest,
  initials,
  longDay,
  matchesQuery,
  needsAction as isWaiting,
  needsCall,
  shiftDay,
  shortDay,
  telHref,
  upcomingWeek,
} from "./dashboardData";
import { BookingFlags, Phone, SourceChip, StatusChip, WhatsAppRowLine } from "./DashboardParts";
import { EASE, LayoutMotion, Ticker, useCalmMotion } from "./Motion";
import { PatientPanel } from "./PatientPanel";
import { NewBookingForm, RescheduleForm } from "./StaffForms";
import { ui } from "./ui";

export { consentLine, splitHint, whatsappLine } from "./DashboardParts";

export type DashboardProps = {
  /** Today (clinic time) onward, from the 5 s poll. */
  bookings: DashboardBooking[];
  /** Status new on any day, wants a new time, or No WhatsApp to call. Worked out from `bookings` when left out. */
  needsAction?: DashboardBooking[];
  /** Bookings created in the last 30 days, by source. */
  sources?: SourceCounts;
  /** YYYY-MM-DD in clinic time, from the API. */
  today: string;
  storage?: "memory" | "postgres";
  live: boolean;
  updatedAt?: Date;
  busyId?: string;
  bookHref: string;
  /** Changes a status. `byPhone`: "Confirmed by phone" for a No-WhatsApp booking. Resolves with the updated booking (or nothing when it failed). */
  onStatus: (id: string, status: BookingStatus, opts?: { byPhone?: boolean }) => void | Promise<DashboardBooking | void>;
  /** Moves a booking to a new day and slot (the patient gets "visit moved"). Resolves with an error message, or null when it worked. */
  onReschedule?: (id: string, date: string, slot: string) => Promise<string | null>;
  /** Asks for fresh live data now (after a new booking or a demo reset). */
  onRefresh?: () => Promise<void> | void;
  onLogout: () => void;
  /** The join link and its QR, drawn on the server. Null or missing = no join step, no panel. */
  optIn?: DeskOptIn | null;
  /** On-demand loaders. Tests pass a fake. */
  api?: AdminApi;
  /** False when DEMO_RESET_DISABLED=1: the Reset demo data button is disabled. */
  demoReset?: boolean;
};

export type DeskOptIn = WhatsAppOptIn & { qr: QrPath };

type Tab = "needs" | "today" | "upcoming" | "past" | "patients";
type Context = Tab | "history";
type PastStatus = "all" | "visited" | "no_show" | "cancelled";

type RowAction = {
  key: string;
  label: string;
  status?: BookingStatus;
  reschedule?: true;
  /** "Confirmed by phone": confirms without sending anything. */
  byPhone?: true;
  /** A link, not a button: the Call action. */
  href?: string;
  tone: "primary" | "plain" | "danger";
  disabled?: boolean;
};

/**
 * The buttons on a row, by tab. Visited and No-show only appear on today's and past rows.
 * "Change day or slot" moves an open booking and sends "visit moved"; it leads for a patient who asked for a new time.
 * A No-WhatsApp booking still to call gets Call (a tel: link) and "Confirmed by phone" first.
 * A cancelled booking gets none: its "Cancelled" chip is all the row shows.
 */
export function actionsFor(b: DashboardBooking, context: Context): RowAction[] {
  if (b.status === "cancelled") return [];
  const confirm: RowAction = { key: "confirm", label: "Confirm", status: "confirmed", tone: "primary", disabled: b.status === "confirmed" };
  const cancel: RowAction = { key: "cancel", label: "Cancel", status: "cancelled", tone: "danger" };
  const visited: RowAction = { key: "visited", label: "Visited", status: "visited", tone: "plain", disabled: b.status === "visited" };
  const noShow: RowAction = { key: "no_show", label: "No-show", status: "no_show", tone: "plain", disabled: b.status === "no_show" };
  const change: RowAction = { key: "reschedule", label: "Change day or slot", reschedule: true, tone: b.wantsNewTime ? "primary" : "plain" };
  const call: RowAction = { key: "call", label: "Call", href: telHref(b.phone), tone: "plain" };
  const byPhone: RowAction = { key: "by_phone", label: "Confirmed by phone", status: "confirmed", byPhone: true, tone: "primary" };
  const open = b.status === "new" || b.status === "confirmed";
  const calling = needsCall(b) ? [call, byPhone] : [];
  // What leads: call first, then a requested new time, then Confirm.
  const lead = calling.length ? calling : b.wantsNewTime ? [change] : [confirm];
  const rest = open && !lead.includes(change) ? [change] : [];
  switch (context) {
    case "needs":
    case "upcoming":
      return [...lead, ...rest, cancel];
    case "today":
      return [...(calling.length ? calling : b.status === "new" ? [confirm] : []), ...(b.wantsNewTime ? [change] : []), visited, noShow, ...(open && !b.wantsNewTime ? [change] : []), cancel];
    case "past":
      return open ? [visited, noShow] : [];
    default:
      return [];
  }
}

const BUTTON: Record<RowAction["tone"], string> = {
  primary: "bg-lotus-accent text-white hover:bg-lotus-accent-hover disabled:bg-lotus-wash disabled:text-lotus-text",
  plain: "bg-white text-lotus-text ring-1 ring-lotus-hairline hover:ring-lotus-accent hover:text-lotus-accent disabled:text-lotus-muted disabled:ring-lotus-hairline",
  danger: "bg-white text-lotus-error ring-1 ring-lotus-hairline hover:ring-lotus-error disabled:text-lotus-muted",
};

/**
 * One booking. Rows slide in on the first load (one after another) and when a poll brings a new one;
 * the others glide to make room (`layout`), and a removed row fades out. Opacity only under reduced motion.
 * A row a poll brings in (`fresh`) also flashes a teal tint that fades to white over 1.2 s.
 */
function Row({
  b,
  index,
  busy,
  fresh,
  context,
  today,
  onAction,
  onOpen,
  ref,
}: {
  b: DashboardBooking;
  index: number;
  busy: boolean;
  /** True when this row arrived after the first load. Read once, when the row mounts. */
  fresh: boolean;
  context: Context;
  today: string;
  onAction: (b: DashboardBooking, a: RowAction) => void;
  onOpen: (b: DashboardBooking) => void;
  /** AnimatePresence's popLayout measures the row through this. */
  ref?: Ref<HTMLLIElement>;
}) {
  const [part, time] = b.slot.split(", ");
  const calm = useCalmMotion();
  const [flash] = useState(fresh);
  // Grouped tabs (Today, Upcoming, Past) carry the day in their headings; Needs action is one flat list across days.
  const showDay = context === "needs";
  const actions = actionsFor(b, context);
  return (
    <m.li
      ref={ref}
      layout={calm ? false : "position"}
      initial={calm ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE, delay: Math.min(index, 6) * 0.05 } }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{ layout: { duration: 0.3, ease: EASE } }}
      data-fresh={flash ? "" : undefined}
      data-booking={b.id}
      className="relative isolate grid gap-2 rounded-2xl bg-white p-4 shadow-lotus ring-1 ring-lotus-hairline sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-5 sm:p-5"
    >
      {flash ? (
        <m.span
          aria-hidden
          data-row-flash=""
          className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-lotus-accent/15"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.15 }}
        />
      ) : null}
      <div className="flex items-baseline gap-2 sm:block">
        {showDay ? <p className="font-semibold text-lotus-text">{dayLabel(b.date, today)}</p> : null}
        <p className={showDay ? "text-sm" : "font-semibold text-lotus-text"}>{part}</p>
        {time ? <p className="text-sm">{time}</p> : null}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpen(b)}
            aria-label={`Open ${b.name}'s history`}
            className={`text-left font-semibold text-lotus-text underline-offset-4 hover:text-lotus-accent hover:underline ${b.status === "cancelled" ? "line-through" : ""}`}
          >
            {b.name}
          </button>
          <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-lotus-text ring-1 ring-lotus-hairline">{b.visitType === "online" ? "Online" : "Clinic"}</span>
          <StatusChip status={b.status} />
          <SourceChip source={b.source ?? "website"} campaign={b.campaign} />
          <BookingFlags b={b} />
        </div>
        <p className="mt-1 text-sm">{b.reason}</p>
        <Phone phone={b.phone} name={b.name} />
        <WhatsAppRowLine b={b} />
        {actions.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {actions.map((a) =>
              a.href ? (
                <a
                  key={a.key}
                  href={a.href}
                  aria-label={`${a.label} ${b.name}`}
                  className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold transition ${BUTTON[a.tone]}`}
                >
                  {a.label}
                </a>
              ) : (
                <button
                  key={a.key}
                  type="button"
                  disabled={busy || a.disabled}
                  onClick={() => onAction(b, a)}
                  aria-label={`${a.label} ${b.name}`}
                  className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold transition disabled:cursor-not-allowed ${BUTTON[a.tone]}`}
                >
                  {a.label}
                </button>
              ),
            )}
          </div>
        ) : null}
      </div>
    </m.li>
  );
}

/** The live dot. While live it sends out a soft teal ring every 2.4 s; still under reduced motion. */
export function LiveDot({ live, updatedAt }: { live: boolean; updatedAt?: Date }) {
  const calm = useCalmMotion();
  return (
    <p className="flex items-center gap-2 text-sm" aria-live="polite">
      <span aria-hidden className="relative flex size-2.5">
        {live && !calm ? (
          <m.span
            data-live-pulse=""
            className="absolute inset-0 rounded-full bg-lotus-accent"
            initial={{ opacity: 0 }}
            animate={{ transform: ["scale(1)", "scale(2.6)"], opacity: [0.35, 0] }}
            transition={{ duration: 2.4, ease: "easeOut", repeat: Infinity, repeatDelay: 0.4 }}
          />
        ) : null}
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

/** The front-desk QR: patients scan it to send the join message, so the clinic can reach them on WhatsApp. */
export function DeskQr({ optIn }: { optIn: DeskOptIn }) {
  const { qr } = optIn;
  return (
    <section aria-labelledby="whatsapp-optin" className={`mt-4 grid gap-5 p-6 sm:mt-6 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8 sm:p-7 ${ui.card}`}>
      <div className="justify-self-start rounded-2xl bg-white p-2 ring-1 ring-lotus-hairline">
        <svg role="img" aria-label="QR code that opens WhatsApp with the join message" viewBox={`0 0 ${qr.size} ${qr.size}`} shapeRendering="crispEdges" className="size-40 bg-white text-lotus-text sm:size-36">
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

/**
 * The clinic dashboard. Data in, callbacks out: AdminApp feeds the live lists; the Past and Patients tabs and
 * the patient panel load through `api`. Loads the layout animation features here, in their own chunk.
 */
export function Dashboard(props: DashboardProps) {
  return (
    <LayoutMotion>
      <DashboardView {...props} />
    </LayoutMotion>
  );
}

function RowList({ items, children }: { items: DashboardBooking[]; children: (b: DashboardBooking, i: number) => ReactNode }) {
  return (
    <ul className="relative mt-3 space-y-3">
      <AnimatePresence mode="popLayout">{items.map((b, i) => children(b, i))}</AnimatePresence>
    </ul>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className={`mt-4 px-6 py-10 text-center ${ui.card}`}>{children}</p>;
}

function DayGroups({ groups, today, render }: { groups: { day: string; items: DashboardBooking[] }[]; today: string; render: (b: DashboardBooking, i: number) => ReactNode }) {
  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <section key={g.day} aria-labelledby={`day-${g.day}`}>
          <h3 id={`day-${g.day}`} className="flex items-baseline gap-3 text-lg font-semibold tracking-tight text-lotus-text">
            {dayLabel(g.day, today)}
            <span className="text-sm font-normal text-lotus-muted">
              {g.items.length} {g.items.length === 1 ? "booking" : "bookings"}
            </span>
          </h3>
          <RowList items={g.items}>{render}</RowList>
        </section>
      ))}
    </div>
  );
}

const PAST_STATUSES: { id: PastStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "visited", label: "Visited" },
  { id: "no_show", label: "No-show" },
  { id: "cancelled", label: "Cancelled" },
];

/** Waits `ms` after the last change before passing a value on, so search does not ask the server on every key. */
function useDebounced<T>(value: T, ms: number) {
  const [out, setOut] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setOut(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return out;
}

function DashboardView({
  bookings,
  needsAction,
  sources = {},
  today,
  storage,
  live,
  updatedAt,
  busyId,
  bookHref,
  onStatus,
  onReschedule,
  onRefresh,
  onLogout,
  optIn,
  api = httpAdminApi,
  demoReset = true,
}: DashboardProps) {
  const id = useId();
  const waiting = useMemo(() => needsAction ?? bookings.filter((b) => isWaiting(b, today)), [needsAction, bookings, today]);
  // The ids in the first lists that had any bookings. Rows that are not in them came in with a later poll.
  const [firstIds, setFirstIds] = useState<Set<string> | null>(null);
  if (firstIds === null && (bookings.length || waiting.length)) setFirstIds(new Set([...bookings, ...waiting].map((b) => b.id)));
  const [tab, setTab] = useState<Tab>(() => (waiting.length ? "needs" : "today"));
  const [query, setQuery] = useState("");
  const q = query.trim();
  const debounced = useDebounced(q, 300);
  const [panel, setPanel] = useState<{ bookingId: string; name: string } | null>(null);
  const [version, setVersion] = useState(0);
  const [dialog, setDialog] = useState<{ kind: "new" } | { kind: "reschedule"; booking: DashboardBooking } | null>(null);
  const [notice, setNotice] = useState("");

  // Past tab: one day, or the last 30 days (default), and a status filter.
  const [pastDay, setPastDay] = useState<string | null>(null);
  const [pastStatus, setPastStatus] = useState<PastStatus>("all");
  const [past, setPast] = useState<{ key: string; rows: DashboardBooking[] } | null>(null);
  const [patients, setPatients] = useState<{ key: number; rows: PatientSummary[] } | null>(null);
  const [loadError, setLoadError] = useState("");

  const counts = adminCounts(bookings, waiting, today);
  const yesterday = shiftDay(today, -1);
  const pastKey = `${pastDay ?? "30"}|${pastStatus}|${debounced}|${version}`;

  useEffect(() => {
    if (tab !== "past") return;
    let live = true;
    const status = pastStatus === "all" ? undefined : pastStatus;
    const load =
      debounced.length >= 2
        ? api.search(debounced).then((rows) => rows.filter((b) => b.date < today && (!status || b.status === status)))
        : api.past({ from: pastDay ?? shiftDay(today, -30), to: pastDay ?? yesterday, status });
    load.then(
      (rows) => {
        if (!live) return;
        setPast({ key: pastKey, rows });
        setLoadError("");
      },
      () => live && setLoadError("Could not load past bookings. Try again."),
    );
    return () => {
      live = false;
    };
  }, [tab, pastKey, pastDay, pastStatus, debounced, api, today, yesterday]);

  useEffect(() => {
    if (tab !== "patients") return;
    let live = true;
    api.patients().then(
      (rows) => {
        if (!live) return;
        setPatients({ key: version, rows });
        setLoadError("");
      },
      () => live && setLoadError("Could not load patients. Try again."),
    );
    return () => {
      live = false;
    };
  }, [tab, version, api]);

  const openPatient = useCallback((b: { id: string; name: string }) => setPanel({ bookingId: b.id, name: b.name }), []);
  const closePanel = useCallback(() => setPanel(null), []);

  async function act(b: DashboardBooking, a: RowAction) {
    if (a.reschedule) {
      setDialog({ kind: "reschedule", booking: b });
      return;
    }
    if (!a.status) return;
    const updated = a.byPhone ? await onStatus(b.id, a.status, { byPhone: true }) : await onStatus(b.id, a.status);
    if (updated) setPast((p) => (p ? { ...p, rows: p.rows.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)) } : p));
    setVersion((v) => v + 1);
  }

  const filtered = (list: DashboardBooking[]) => (q ? list.filter((b) => matchesQuery(b, q)) : list);
  const needsRows = filtered(waiting);
  const todayRows = filtered(bookings.filter((b) => b.date === today));
  const remindRows = filtered(callToRemind(bookings, today));
  const upcomingRows = filtered(upcomingWeek(bookings, today));
  const patientRows = (patients?.rows ?? []).filter((p) => matchesQuery(p, q));

  const render = (context: Context, liveList: boolean) => {
    function RenderRow(b: DashboardBooking, i: number) {
      return (
        <Row
          key={b.id}
          b={b}
          index={i}
          busy={busyId === b.id}
          fresh={liveList && firstIds !== null && !firstIds.has(b.id)}
          context={context}
          today={today}
          onAction={(row, a) => void act(row, a)}
          onOpen={openPatient}
        />
      );
    }
    return RenderRow;
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "needs", label: "Needs action", count: needsRows.length },
    { id: "today", label: "Today", count: todayRows.length },
    { id: "upcoming", label: "Upcoming", count: upcomingRows.length },
    { id: "past", label: "Past" },
    { id: "patients", label: "Patients" },
  ];

  const tiles = [
    { label: "Needs action", value: counts.needsAction },
    { label: "Today", value: counts.today },
    { label: "Visited today", value: counts.visitedToday },
    { label: "This week", value: counts.week },
  ];

  const noMatch = q ? <Empty>No matches for “{q}”.</Empty> : null;

  let content: ReactNode;
  if (tab === "needs") {
    content = needsRows.length ? (
      <RowList items={needsRows}>{render("needs", true)}</RowList>
    ) : (
      (noMatch ?? <Empty>Nothing needs action. New requests, patients who ask for a new time and patients to call show up here.</Empty>)
    );
  } else if (tab === "today") {
    content =
      !bookings.length && !waiting.length ? (
        <div className={`mt-4 px-6 py-12 text-center ${ui.card}`}>
          <span aria-hidden className="mx-auto flex size-12 items-center justify-center rounded-full ring-1 ring-lotus-hairline">
            <CalendarX2 strokeWidth={1.5} className="size-6 text-lotus-accent" />
          </span>
          <h3 className="mt-4 text-2xl font-semibold tracking-tight text-lotus-text">No bookings yet</h3>
          <p className="mx-auto mt-1.5 max-w-md">New requests from the booking page show up here within 5 seconds.</p>
          <a href={bookHref} target="_blank" rel="noopener" className={`mt-5 ${ui.primary}`}>
            Open the booking page
          </a>
        </div>
      ) : (
        <>
          {todayRows.length ? <RowList items={groupByDay(todayRows).flatMap((g) => g.items)}>{render("today", true)}</RowList> : (noMatch ?? <Empty>No bookings today.</Empty>)}
          {remindRows.length ? <CallToRemind rows={remindRows} /> : null}
        </>
      );
  } else if (tab === "upcoming") {
    content = upcomingRows.length ? (
      <div className="mt-4">
        <DayGroups groups={groupByDay(upcomingRows)} today={today} render={render("upcoming", true)} />
      </div>
    ) : (
      (noMatch ?? <Empty>Nothing booked for the next 7 days.</Empty>)
    );
  } else if (tab === "past") {
    const rows = past?.key === pastKey ? past.rows : null;
    content = (
      <>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Previous day"
              onClick={() => setPastDay((d) => shiftDay(d ?? today, -1))}
              className="inline-flex size-10 items-center justify-center rounded-full bg-white ring-1 ring-lotus-hairline hover:text-lotus-accent hover:ring-lotus-accent"
            >
              <ChevronLeft aria-hidden className="size-4" strokeWidth={2} />
            </button>
            <label className="sr-only" htmlFor={`${id}-day`}>
              Day
            </label>
            <input
              id={`${id}-day`}
              type="date"
              max={yesterday}
              value={pastDay ?? ""}
              onChange={(e) => setPastDay(e.target.value && e.target.value < today ? e.target.value : null)}
              className="min-h-10 rounded-full border-0 bg-white px-4 text-sm text-lotus-text ring-1 ring-lotus-field focus:ring-2 focus:ring-lotus-accent focus:outline-none"
            />
            <button
              type="button"
              aria-label="Next day"
              disabled={!pastDay || pastDay >= yesterday}
              onClick={() => setPastDay((d) => (d ? shiftDay(d, 1) : d))}
              className="inline-flex size-10 items-center justify-center rounded-full bg-white ring-1 ring-lotus-hairline hover:text-lotus-accent hover:ring-lotus-accent disabled:cursor-not-allowed disabled:text-lotus-muted disabled:hover:ring-lotus-hairline"
            >
              <ChevronRight aria-hidden className="size-4" strokeWidth={2} />
            </button>
          </div>
          <button
            type="button"
            aria-pressed={pastDay === null}
            onClick={() => setPastDay(null)}
            className={`min-h-10 rounded-full px-4 text-sm font-semibold ring-1 transition ${pastDay === null ? "bg-lotus-text text-white ring-lotus-text" : "bg-white text-lotus-text ring-lotus-hairline hover:ring-lotus-accent"}`}
          >
            Last 30 days
          </button>
          <div role="group" aria-label="Status" className="flex flex-wrap gap-1.5 sm:ml-auto">
            {PAST_STATUSES.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={pastStatus === s.id}
                onClick={() => setPastStatus(s.id)}
                className={`min-h-10 rounded-full px-3.5 text-sm font-semibold ring-1 transition ${pastStatus === s.id ? "bg-lotus-accent text-white ring-lotus-accent" : "bg-white text-lotus-text ring-lotus-hairline hover:ring-lotus-accent"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 text-sm">
          {debounced.length >= 2 ? `Matches for “${debounced}” on any past day` : pastDay ? longDay(pastDay) : `${longDay(shiftDay(today, -30))} to ${longDay(yesterday)}`}
          {rows ? ` · ${rows.length} ${rows.length === 1 ? "booking" : "bookings"}` : ""}
        </p>
        {loadError ? (
          <p role="alert" className="mt-3 text-sm font-semibold text-lotus-error">
            {loadError}
          </p>
        ) : !rows ? (
          <p className="mt-6 text-sm">Loading…</p>
        ) : rows.length ? (
          <div className="mt-4">
            <DayGroups groups={groupByDayNewest(rows)} today={today} render={render("past", false)} />
          </div>
        ) : (
          <Empty>No bookings here.</Empty>
        )}
      </>
    );
  } else {
    content = loadError ? (
      <p role="alert" className="mt-4 text-sm font-semibold text-lotus-error">
        {loadError}
      </p>
    ) : !patients ? (
      <p className="mt-6 text-sm">Loading…</p>
    ) : patientRows.length ? (
      <ul className="mt-4 space-y-2.5" aria-label="Patients">
        {patientRows.map((p) => (
          <li key={p.phone} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-white p-4 shadow-lotus ring-1 ring-lotus-hairline">
            <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lotus-avatar text-sm font-bold text-lotus-accent-hover">
              {initials(p.name)}
            </span>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => openPatient({ id: p.latestBookingId, name: p.name })}
                aria-label={`Open ${p.name}'s history`}
                className="text-left font-semibold text-lotus-text underline-offset-4 hover:text-lotus-accent hover:underline"
              >
                {p.name}
              </button>
              <p className="text-sm">
                {p.visits} {p.visits === 1 ? "visit" : "visits"}
                {p.firstVisit ? ` · first ${shortDay(p.firstVisit)}` : " · not visited yet"}
                {` · last booking ${shortDay(p.lastDate)}`}
              </p>
            </div>
            <SourceChip source={p.source} campaign={p.campaign} />
            <Phone phone={p.phone} name={p.name} />
          </li>
        ))}
      </ul>
    ) : (
      (noMatch ?? <Empty>No patients yet.</Empty>)
    );
  }

  const sourceList = BOOKING_SOURCES.filter((s) => (sources[s] ?? 0) > 0).sort((a, b) => (sources[b] ?? 0) - (sources[a] ?? 0));
  const sourceTotal = sourceList.reduce((n, s) => n + (sources[s] ?? 0), 0);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 basis-60">
          <label htmlFor={`${id}-search`} className="sr-only">
            Search name or phone
          </label>
          <Search aria-hidden strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-lotus-muted" />
          <input
            id={`${id}-search`}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or phone"
            autoComplete="off"
            className="block min-h-12 w-full rounded-full border-0 bg-white py-3 pr-4 pl-11 text-base text-lotus-text ring-1 ring-lotus-field placeholder:text-lotus-muted focus:ring-2 focus:ring-lotus-accent focus:outline-none"
          />
        </div>
        <button type="button" onClick={() => setDialog({ kind: "new" })} className={ui.primary}>
          <Plus aria-hidden strokeWidth={2} className="size-4" />
          New booking
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <LiveDot live={live} updatedAt={updatedAt} />
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-lotus-text ring-1 ring-lotus-hairline transition hover:text-lotus-accent hover:ring-lotus-accent"
        >
          <LogOut aria-hidden strokeWidth={1.75} className="size-4" />
          Log out
        </button>
      </div>

      <p aria-live="polite" className="sr-only">
        {notice}
      </p>
      {notice ? (
        <p className="mt-4 rounded-2xl bg-lotus-tint p-4 text-sm font-semibold text-lotus-text ring-1 ring-lotus-hairline" aria-hidden>
          {notice}
        </p>
      ) : null}

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
        {tiles.map((t) => (
          <div key={t.label} className={`p-4 sm:p-6 ${ui.card}`}>
            <dt className="text-sm">{t.label}</dt>
            <dd className="mt-1 text-3xl font-bold tracking-tight text-lotus-text sm:text-4xl">
              <Ticker value={t.value} />
            </dd>
          </div>
        ))}
      </dl>

      {optIn ? <DeskQr optIn={optIn} /> : null}

      {storage === "memory" ? (
        <p className="mt-4 rounded-2xl bg-lotus-wash p-4 text-sm text-lotus-text">
          Test storage: no database is connected, so bookings live in server memory and vanish when it restarts.
        </p>
      ) : null}

      <div className={`mt-8 ${panel ? "lg:grid lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-start lg:gap-6" : ""}`}>
        <div className="min-w-0">
          <div role="tablist" aria-label="Bookings" className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-lotus-hairline">
            {tabs.map((t) => {
              const selected = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`${id}-tab-${t.id}`}
                  aria-selected={selected}
                  aria-controls={`${id}-panel`}
                  onClick={() => {
                    setTab(t.id);
                    setLoadError("");
                  }}
                  className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-[15px] font-semibold whitespace-nowrap transition ${
                    selected ? "border-lotus-accent text-lotus-text" : "border-transparent text-lotus-muted hover:text-lotus-text"
                  }`}
                >
                  {t.label}
                  {t.count !== undefined ? (
                    <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${selected ? "bg-lotus-accent text-white" : "bg-lotus-wash text-lotus-text"}`}>{t.count}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div key={tab} role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${tab}`} className="pb-2">
            {content}
          </div>
        </div>
        {panel ? <PatientPanel key={panel.bookingId} bookingId={panel.bookingId} name={panel.name} api={api} version={version} onClose={closePanel} /> : null}
      </div>

      <section aria-labelledby={`${id}-sources`} className={`mt-10 p-5 sm:p-6 ${ui.card}`}>
        <h2 id={`${id}-sources`} className="text-base font-semibold text-lotus-text">
          Bookings by source, last 30 days
          {sourceTotal ? <span className="ml-2 text-sm font-normal text-lotus-muted">{sourceTotal} in all</span> : null}
        </h2>
        {sourceList.length ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {sourceList.map((s) => (
              <li key={s} data-source-count={s} className="inline-flex items-center gap-2 rounded-full bg-white py-1 pr-1 pl-3 text-sm text-lotus-text ring-1 ring-lotus-hairline">
                {SOURCE_LABELS[s]}
                <span className="rounded-full bg-lotus-avatar px-2 py-0.5 text-xs font-bold text-lotus-accent-hover tabular-nums">{sources[s]}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm">No bookings in the last 30 days.</p>
        )}
      </section>

      <ResetDemo
        enabled={demoReset}
        onReset={async () => {
          const result = await api.resetDemo();
          await onRefresh?.();
          // The fresh rows are not news: they should not all flash in.
          setFirstIds(null);
          setPast(null);
          setPatients(null);
          setPanel(null);
          setVersion((v) => v + 1);
          setNotice(`Demo data reset: ${result.inserted} sample bookings for today. Real bookings were not touched.`);
        }}
      />

      <AdminDialog open={dialog?.kind === "new"} title="New booking" onClose={() => setDialog(null)}>
        <NewBookingForm
          api={api}
          today={today}
          onDone={async (b) => {
            setDialog(null);
            setNotice(`Booking saved for ${b.name}, ${shortDay(b.date)}.`);
            setVersion((v) => v + 1);
            await onRefresh?.();
          }}
        />
      </AdminDialog>
      <AdminDialog
        open={dialog?.kind === "reschedule"}
        title={dialog?.kind === "reschedule" ? `Change day or slot for ${dialog.booking.name}` : "Change day or slot"}
        onClose={() => setDialog(null)}
      >
        {dialog?.kind === "reschedule" ? (
          <RescheduleForm
            booking={dialog.booking}
            today={today}
            onSave={async (date, slot) => {
              const problem = onReschedule ? await onReschedule(dialog.booking.id, date, slot) : "Rescheduling is not available.";
              if (!problem) {
                setDialog(null);
                setVersion((v) => v + 1);
                setNotice(`${dialog.booking.name} moved to ${shortDay(date)}, ${slot.split(",")[0].toLowerCase()}. The patient is asked to confirm on WhatsApp.`);
              }
              return problem;
            }}
          />
        ) : null}
      </AdminDialog>
    </div>
  );
}

/** Tomorrow's patients who get no WhatsApp reminder (No WhatsApp, opted out, no consent), so the desk calls. Under Today's rows. */
function CallToRemind({ rows }: { rows: DashboardBooking[] }) {
  return (
    <section aria-labelledby="call-to-remind" data-call-to-remind="" className={`mt-6 p-5 sm:p-6 ${ui.card}`}>
      <h3 id="call-to-remind" className="text-base font-semibold text-lotus-text">
        Call to remind <span className="ml-1 text-sm font-normal text-lotus-muted">tomorrow · {rows.length}</span>
      </h3>
      <p className="mt-1 text-sm">No WhatsApp reminder goes out to these patients. Call them today.</p>
      <ul className="mt-3 divide-y divide-lotus-hairline">
        {rows.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-lotus-text">{b.name}</span>
              <span className="block text-sm">{b.slot}</span>
              <span data-remind-reason="" className="block text-xs text-lotus-muted">
                {remindReason(b)}
              </span>
            </span>
            <Phone phone={b.phone} name={b.name} />
            <a
              href={telHref(b.phone)}
              aria-label={`Call ${b.name}`}
              className="inline-flex min-h-10 items-center rounded-full bg-white px-4 text-sm font-semibold text-lotus-text ring-1 ring-lotus-hairline transition hover:text-lotus-accent hover:ring-lotus-accent"
            >
              Call
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A quiet button at the bottom of the page, with a confirm step. Replaces only the sample (is_demo) bookings. */
function ResetDemo({ enabled, onReset }: { enabled: boolean; onReset: () => Promise<void> }) {
  const [step, setStep] = useState<"idle" | "confirm" | "busy" | "error">("idle");
  return (
    <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-lotus-hairline pt-6 text-sm">
      {step === "confirm" || step === "busy" ? (
        <>
          <p className="text-lotus-text">Replace the sample bookings with fresh ones for today? Real bookings stay as they are.</p>
          <button
            type="button"
            disabled={step === "busy"}
            onClick={async () => {
              setStep("busy");
              try {
                await onReset();
                setStep("idle");
              } catch {
                setStep("error");
              }
            }}
            className="inline-flex min-h-10 items-center rounded-full bg-lotus-text px-4 font-semibold text-white disabled:opacity-70"
          >
            {step === "busy" ? "Resetting…" : "Reset now"}
          </button>
          <button type="button" disabled={step === "busy"} onClick={() => setStep("idle")} className="inline-flex min-h-10 items-center rounded-full px-4 font-semibold text-lotus-text ring-1 ring-lotus-hairline">
            Keep
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            disabled={!enabled}
            onClick={() => setStep("confirm")}
            className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 font-semibold text-lotus-muted transition hover:text-lotus-text disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw aria-hidden strokeWidth={1.75} className="size-4" />
            Reset demo data
          </button>
          {!enabled ? <span>Turned off on this site.</span> : null}
          {step === "error" ? (
            <span role="alert" className="font-semibold text-lotus-error">
              Could not reset the demo data. Try again.
            </span>
          ) : null}
        </>
      )}
    </div>
  );
}
