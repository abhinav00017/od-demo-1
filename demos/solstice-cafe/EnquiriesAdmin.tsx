"use client";

import { Lock, LogOut, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import { PUBLIC_SOURCES, SOURCE_LABELS, type PublicSource } from "@/lib/bookings/sources";
import { ENQUIRY_STATUSES, type Enquiry, type EnquiryStatus } from "@/lib/cafeEvents/types";
import { eventTypeLabel, slotLabel, venueById } from "./events";
import { CafeOgiBubble } from "./OgiBubble";

type Session = { configured: boolean; devPassword: boolean; authed: boolean };
type View = { kind: "loading" } | { kind: "error" } | { kind: "off" } | { kind: "login"; devPassword: boolean } | { kind: "in" };
type ListResponse = {
  ok: boolean;
  today: string;
  storage: "memory" | "postgres";
  enquiries: Enquiry[];
  sources?: Partial<Record<PublicSource, number>>;
  viaOgi?: number;
};
/** Which enquiries the list shows: every one, one status, one source, or the ones sent through Ogi. */
type Filter = { kind: "all" } | { kind: "status"; value: EnquiryStatus } | { kind: "source"; value: PublicSource } | { kind: "ogi" };

/** How often the list asks for new enquiries while the tab is visible. */
const POLL_MS = 10_000;

const STATUS_LABEL: Record<EnquiryStatus, string> = { new: "New", contacted: "Contacted", confirmed: "Confirmed", declined: "Declined" };
/** A dot colour per status; the word is always shown too, so colour is never the only signal. */
const STATUS_DOT: Record<EnquiryStatus, string> = {
  new: "bg-sol-terra",
  contacted: "bg-sol-stone-400",
  confirmed: "bg-sol-sage",
  declined: "bg-sol-error",
};

const CARD = "rounded-2xl border border-sol-stone-200/90 bg-white";
const BUTTON = "inline-flex cursor-pointer items-center gap-2 rounded-lg border border-sol-stone-300 bg-white px-3.5 py-2 text-sm font-medium text-sol-ink hover:border-sol-sage hover:text-sol-sage";

function dayLabel(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function daysBetween(from: string, to: string) {
  const ms = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((ms(to) - ms(from)) / 86_400_000);
}

function whenLabel(today: string, day: string) {
  const n = daysBetween(today, day);
  if (n < 0) return "Past";
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  return `In ${n} days`;
}

function receivedLabel(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

function Login({ devPassword, onDone }: { devPassword: boolean; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const id = useId();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/cafe/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) onDone();
      else setError(data.error ?? "Could not log in. Try again.");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} aria-label="Cafe owner login" className={`mx-auto max-w-md p-6 sm:p-8 ${CARD}`}>
      <span aria-hidden className="flex size-10 items-center justify-center rounded-full ring-1 ring-sol-stone-200">
        <Lock strokeWidth={1.75} className="size-5 text-sol-sage" />
      </span>
      <h1 className="mt-4 font-sol-display text-2xl font-normal text-sol-ink">Cafe owner only</h1>
      <p className="mt-1.5 text-sm text-sol-stone-600">Enter the cafe password to see event enquiries.</p>
      {devPassword ? (
        <p className="mt-4 rounded-xl bg-sol-oat p-4 text-sm text-sol-ink">
          Development mode: CAFE_ADMIN_PASSWORD is not set, so the password is <strong>testpass</strong>.
        </p>
      ) : null}
      <label htmlFor={`${id}-pw`} className="mt-5 block text-sm font-medium text-sol-ink">
        Password
      </label>
      <input
        id={`${id}-pw`}
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className="mt-1.5 w-full rounded-lg border border-sol-stone-300 bg-white px-3.5 py-2.5 text-sm focus:border-sol-sage focus:outline-none"
      />
      {error ? (
        <p id={`${id}-err`} role="alert" className="mt-2 text-sm font-semibold text-sol-error">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="mt-5 w-full cursor-pointer rounded-lg bg-sol-sage px-6 py-3 text-sm font-medium text-white hover:bg-sol-sage-deep disabled:opacity-60"
      >
        {busy ? "Checking…" : "Log in"}
      </button>
    </form>
  );
}

function EnquiryCard({ e, today, onStatus }: { e: Enquiry; today: string; onStatus: (id: string, s: EnquiryStatus) => void }) {
  const venue = venueById(e.venue);
  const id = useId();
  const past = daysBetween(today, e.date) < 0;
  return (
    <li className={`${CARD} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold text-sol-ink">{e.name}</p>
          <p className="mt-0.5 text-sm text-sol-stone-600">
            {venue?.name ?? e.venue} · {eventTypeLabel(e.eventType)}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-sol-stone-200 px-3 py-1 text-xs font-medium text-sol-ink">
          <span aria-hidden className={`size-2 rounded-full ${STATUS_DOT[e.status]}`} />
          {STATUS_LABEL[e.status]}
        </span>
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span data-enquiry-source={e.source} className="rounded-full bg-sol-oat px-2.5 py-1 font-medium text-sol-ink">
          <span className="sr-only">Source: </span>
          {SOURCE_LABELS[e.source]}
        </span>
        {e.channel === "ogi" ? (
          <span data-enquiry-ogi="" className="rounded-full bg-brand-soft px-2.5 py-1 font-medium text-brand-strong">
            via Ogi
          </span>
        ) : null}
        {e.campaign ? <span className="text-sol-stone-600">Campaign: {e.campaign}</span> : null}
        {e.isDemo ? <span className="text-sol-stone-500">Sample</span> : null}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
        <div className="col-span-2">
          <dt className="text-xs text-sol-stone-500">Date and time</dt>
          <dd className="text-sol-ink">
            <span className="font-sol-mono tabular-nums">{dayLabel(e.date)}</span>{" "}
            <span className={`ml-1 rounded px-1.5 py-0.5 text-xs ${past ? "bg-sol-stone-100 text-sol-stone-600" : "bg-sol-sage/10 text-sol-sage-deep"}`}>
              {whenLabel(today, e.date)}
            </span>
            <span className="block text-sol-stone-600">{slotLabel(venue, e.slot)}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-sol-stone-500">Guests</dt>
          <dd className="font-sol-mono text-sol-ink tabular-nums">{e.guests}</dd>
        </div>
        <div>
          <dt className="text-xs text-sol-stone-500">Mobile</dt>
          <dd>
            <a href={`tel:+91${e.phone}`} className="font-sol-mono text-sol-ink tabular-nums underline-offset-4 hover:text-sol-sage hover:underline">
              {e.phone.slice(0, 5)} {e.phone.slice(5)}
            </a>
          </dd>
        </div>
      </dl>

      {e.notes ? <p className="mt-4 rounded-xl bg-sol-oat/70 p-3 text-sm leading-relaxed whitespace-pre-line text-sol-stone-700">{e.notes}</p> : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-sol-stone-100 pt-4">
        <p className="text-xs text-sol-stone-500">
          <span className="font-sol-mono tabular-nums">{e.reference}</span> · received {receivedLabel(e.createdAt)}
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor={`${id}-status`} className="text-xs font-medium text-sol-stone-700">
            Status
          </label>
          <select
            id={`${id}-status`}
            value={e.status}
            onChange={(ev) => onStatus(e.id, ev.target.value as EnquiryStatus)}
            className="rounded-lg border border-sol-stone-300 bg-white px-3 py-2 text-sm text-sol-ink focus:border-sol-sage focus:outline-none"
          >
            {ENQUIRY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </li>
  );
}

/**
 * The cafe owner's list of event enquiries at /cafe/website/events/admin. A static page: the browser asks
 * /api/cafe/session who is looking, then shows the login or the list. Newest first; status changes save at once.
 */
export function EnquiriesAdmin() {
  const [view, setView] = useState<View>({ kind: "loading" });
  const [data, setData] = useState<ListResponse | null>(null);
  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/cafe/admin/enquiries", { cache: "no-store" });
      if (res.status === 401) {
        setView({ kind: "login", devPassword: false });
        return;
      }
      const body = (await res.json()) as ListResponse;
      if (body.ok) setData(body);
    } catch {
      setMessage("Could not load enquiries. Check your connection.");
    }
  }, []);

  const start = useCallback(() => {
    fetch("/api/cafe/session", { cache: "no-store" })
      .then((r) => r.json() as Promise<Session>)
      .then(
        (s) => {
          if (!s.configured) setView({ kind: "off" });
          else if (!s.authed) setView({ kind: "login", devPassword: s.devPassword });
          else {
            setView({ kind: "in" });
            void load();
          }
        },
        () => setView({ kind: "error" }),
      );
  }, [load]);

  useEffect(() => {
    start();
  }, [start]);

  useEffect(() => {
    if (view.kind !== "in") return;
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [view.kind, load]);

  async function changeStatus(id: string, status: EnquiryStatus) {
    const before = data;
    setMessage("");
    setData((d) => d && { ...d, enquiries: d.enquiries.map((e) => (e.id === id ? { ...e, status } : e)) });
    try {
      const res = await fetch(`/api/cafe/admin/enquiries/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; enquiry?: Enquiry; error?: string };
      if (res.status === 401) {
        setView({ kind: "login", devPassword: false });
        return;
      }
      if (!res.ok || !body.enquiry) throw new Error(body.error);
      setData((d) => d && { ...d, enquiries: d.enquiries.map((e) => (e.id === id ? body.enquiry! : e)) });
      setMessage(`${body.enquiry.reference} is now ${STATUS_LABEL[status].toLowerCase()}.`);
    } catch {
      setData(before);
      setMessage("Could not save the status. Try again.");
    }
  }

  async function logout() {
    await fetch("/api/cafe/logout", { method: "POST" }).catch(() => undefined);
    setData(null);
    start();
  }

  if (view.kind === "loading") return <p className="py-16 text-center text-sm text-sol-stone-600">Loading…</p>;
  if (view.kind === "error") return <p className="py-16 text-center text-sm text-sol-stone-600">Could not reach the server. Reload the page to try again.</p>;
  if (view.kind === "off")
    return (
      <div className={`mx-auto max-w-md p-6 sm:p-8 ${CARD}`}>
        <h1 className="font-sol-display text-2xl font-normal text-sol-ink">Enquiry list not configured</h1>
        <p className="mt-2 text-sm text-sol-stone-600">Set CAFE_ADMIN_PASSWORD on the server to turn it on.</p>
      </div>
    );
  if (view.kind === "login") return <Login devPassword={view.devPassword} onDone={start} />;

  const all = data?.enquiries ?? [];
  const today = data?.today ?? "";
  const shown = all.filter((e) =>
    filter.kind === "status" ? e.status === filter.value : filter.kind === "source" ? e.source === filter.value : filter.kind === "ogi" ? e.channel === "ogi" : true,
  );
  const count = (s: EnquiryStatus) => all.filter((e) => e.status === s).length;
  const sources = data?.sources ?? {};
  const sourceList = PUBLIC_SOURCES.filter((s) => (sources[s] ?? 0) > 0).sort((a, b) => (sources[b] ?? 0) - (sources[a] ?? 0));
  const viaOgi = data?.viaOgi ?? 0;
  const pressed = (f: Filter) => filter.kind === f.kind && ("value" in filter ? "value" in f && filter.value === f.value : true);
  const chip = (on: boolean) =>
    `cursor-pointer rounded-full border px-3.5 py-1.5 text-sm ${on ? "border-sol-ink bg-sol-ink text-white" : "border-sol-stone-300 bg-white text-sol-ink hover:border-sol-sage"}`;
  const upcoming = all.filter((e) => e.status !== "declined" && today && daysBetween(today, e.date) >= 0).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-sol-sage">Solstice · Events</p>
          <h1 className="mt-1 font-sol-display text-3xl font-normal tracking-tight text-sol-ink">Event enquiries</h1>
          {data?.storage === "memory" ? (
            <p className="mt-1 text-xs text-sol-stone-500">Saved in server memory for this demo. They clear when the server restarts.</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void load()} className={BUTTON}>
            <RefreshCw aria-hidden className="h-4 w-4" />
            Refresh
          </button>
          <button type="button" onClick={() => void logout()} className={BUTTON}>
            <LogOut aria-hidden className="h-4 w-4" />
            Log out
          </button>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "New", value: count("new") },
          { label: "Contacted", value: count("contacted") },
          { label: "Confirmed", value: count("confirmed") },
          { label: "Upcoming", value: upcoming },
        ].map((t) => (
          <div key={t.label} className={`${CARD} p-4`}>
            <dt className="text-xs text-sol-stone-500">{t.label}</dt>
            <dd className="mt-1 font-sol-mono text-2xl text-sol-ink tabular-nums">{t.value}</dd>
          </div>
        ))}
      </dl>

      <OrdersSummary />

      <section aria-labelledby="enquiry-sources" className={`mt-6 p-5 ${CARD}`}>
        <h2 id="enquiry-sources" className="text-sm font-semibold text-sol-ink">
          Where enquiries come from
          {all.length ? <span className="ml-2 font-normal text-sol-stone-500">{all.length} in all</span> : null}
        </h2>
        {sourceList.length ? (
          <div role="group" aria-label="Show enquiries by source" className="mt-3 flex flex-wrap gap-2">
            {sourceList.map((s) => {
              const f: Filter = { kind: "source", value: s };
              return (
                <button key={s} type="button" data-source-count={s} aria-pressed={pressed(f)} onClick={() => setFilter(pressed(f) ? { kind: "all" } : f)} className={chip(pressed(f))}>
                  {SOURCE_LABELS[s]} <span className="font-sol-mono tabular-nums">{sources[s]}</span>
                </button>
              );
            })}
            {viaOgi ? (
              <button
                type="button"
                data-source-count="ogi"
                aria-pressed={pressed({ kind: "ogi" })}
                onClick={() => setFilter(pressed({ kind: "ogi" }) ? { kind: "all" } : { kind: "ogi" })}
                className={chip(pressed({ kind: "ogi" }))}
              >
                Sent via Ogi <span className="font-sol-mono tabular-nums">{viaOgi}</span>
              </button>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm text-sol-stone-600">No enquiries yet.</p>
        )}
        <p className="mt-3 text-xs text-sol-stone-500">From the visitor&apos;s first visit: ad clicks, Google, WhatsApp links. Via Ogi means sent with the chat assistant.</p>
      </section>

      <div role="group" aria-label="Show enquiries by status" className="mt-6 flex flex-wrap gap-2">
        {(["all", ...ENQUIRY_STATUSES] as const).map((s) => {
          const f: Filter = s === "all" ? { kind: "all" } : { kind: "status", value: s };
          return (
            <button key={s} type="button" aria-pressed={pressed(f)} onClick={() => setFilter(f)} className={chip(pressed(f))}>
              {s === "all" ? `All (${all.length})` : `${STATUS_LABEL[s]} (${count(s)})`}
            </button>
          );
        })}
      </div>

      <p role="status" aria-live="polite" className="mt-4 min-h-5 text-sm text-sol-sage-deep">
        {message}
      </p>

      {!data ? (
        <p className="py-10 text-center text-sm text-sol-stone-600">Loading enquiries…</p>
      ) : shown.length === 0 ? (
        <p className={`${CARD} mt-2 p-8 text-center text-sm text-sol-stone-600`}>
          {all.length === 0 ? "No enquiries yet. They appear here as soon as a visitor sends one from a venue page." : "No enquiries match this filter."}
        </p>
      ) : (
        <ul className="mt-2 space-y-4">
          {shown.map((e) => (
            <EnquiryCard key={e.id} e={e} today={today} onStatus={(id, s) => void changeStatus(id, s)} />
          ))}
        </ul>
      )}
      {/* Owner Ogi: read-only answers from the cafe's own data. The server checks the cafe login on every message. */}
      <CafeOgiBubble owner />
    </div>
  );
}

type OrdersSummaryData = { ok: boolean; from: string; to: string; orders: number; sales: number; top: { name: string; itemsSold: number }[] };

/** Orders and sales in the last 7 days, and the top 3 items, from /api/cafe/admin/orders. */
function OrdersSummary() {
  const [data, setData] = useState<OrdersSummaryData | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetch("/api/cafe/admin/orders", { cache: "no-store" })
      .then((r) => r.json() as Promise<OrdersSummaryData>)
      .then((d) => (d.ok ? setData(d) : setFailed(true)), () => setFailed(true));
  }, []);
  return (
    <section aria-labelledby="orders-summary" data-orders-summary="" className={`mt-6 p-5 ${CARD}`}>
      <h2 id="orders-summary" className="text-sm font-semibold text-sol-ink">
        Orders <span className="ml-2 font-normal text-sol-stone-500">last 7 days</span>
      </h2>
      {failed ? (
        <p className="mt-2 text-sm text-sol-stone-600">Could not load orders.</p>
      ) : !data ? (
        <p className="mt-2 text-sm text-sol-stone-600">Loading orders…</p>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-[auto_auto_1fr] sm:gap-8">
          <div>
            <p className="text-xs text-sol-stone-500">Orders</p>
            <p className="mt-1 font-sol-mono text-2xl text-sol-ink tabular-nums">{data.orders.toLocaleString("en-IN")}</p>
          </div>
          <div>
            <p className="text-xs text-sol-stone-500">Sales (incl. GST)</p>
            <p className="mt-1 font-sol-mono text-2xl text-sol-ink tabular-nums">₹{data.sales.toLocaleString("en-IN")}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-sol-stone-500">Top items</p>
            <ol className="mt-1 space-y-0.5 text-sm text-sol-ink">
              {data.top.map((t, i) => (
                <li key={t.name} className="flex justify-between gap-3">
                  <span className="truncate">
                    {i + 1}. {t.name}
                  </span>
                  <span className="font-sol-mono text-sol-stone-600 tabular-nums">{t.itemsSold} sold</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </section>
  );
}
