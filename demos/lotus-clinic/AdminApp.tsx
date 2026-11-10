"use client";

import { Lock } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import type { Booking, BookingStatus, DashboardBooking, SourceCounts } from "@/lib/bookings/types";
import { httpAdminApi, onLoggedOut } from "./adminApi";
import { Dashboard, type DeskOptIn } from "./Dashboard";
import { needsAction as isWaiting } from "./dashboardData";
import { ui } from "./ui";

/** Sent when an on-demand load finds the session gone. */
const LOGGED_OUT_EVENT = "lotus-admin-logged-out";

/** How often the dashboard asks for new bookings. */
export const POLL_MS = 5000;

type Session = { configured: boolean; devPassword: boolean; authed: boolean; storage?: "memory" | "postgres"; demoReset?: boolean };
type Live = { ok: boolean; today: string; storage: Session["storage"]; bookings: DashboardBooking[]; needsAction?: DashboardBooking[]; sources?: SourceCounts };
type View = { kind: "loading" } | { kind: "error"; message: string } | { kind: "off" } | { kind: "login"; devPassword: boolean } | { kind: "in" };

async function fetchSession(): Promise<Session> {
  const res = await fetch("/api/admin/session", { cache: "no-store" });
  return (await res.json()) as Session;
}

const card = `mx-auto max-w-md p-6 sm:p-8 ${ui.card}`;

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
      const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
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
    <form onSubmit={submit} className={card} aria-label="Clinic login">
      <span aria-hidden className="flex size-10 items-center justify-center rounded-full ring-1 ring-lotus-hairline">
        <Lock strokeWidth={1.75} className="size-5 text-lotus-accent" />
      </span>
      <h2 className="mt-4 text-2xl font-semibold tracking-tight text-lotus-text">Clinic staff only</h2>
      <p className="mt-1.5">Enter the clinic password to see bookings.</p>
      {devPassword ? (
        <p className="mt-4 rounded-2xl bg-lotus-wash p-4 text-sm text-lotus-text">
          Development mode: ADMIN_PASSWORD is not set, so the password is <strong>demo</strong>.
        </p>
      ) : null}
      <label htmlFor={`${id}-pw`} className="mt-5 block font-medium text-lotus-text">
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
        className={ui.input}
      />
      {error ? (
        <p id={`${id}-err`} role="alert" className="mt-2 text-sm font-semibold text-lotus-error">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy || !password}
        className={`mt-5 w-full disabled:cursor-not-allowed disabled:bg-lotus-wash disabled:text-lotus-text ${ui.primary}`}
      >
        {busy ? "Checking…" : "Log in"}
      </button>
    </form>
  );
}

/** Password gate plus the live bookings view. Everything loads in the browser, so the page itself stays static. */
export function AdminApp({ bookHref, optIn }: { bookHref: string; optIn?: DeskOptIn | null }) {
  const [view, setView] = useState<View>({ kind: "loading" });
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [waiting, setWaiting] = useState<DashboardBooking[]>([]);
  const [sources, setSources] = useState<SourceCounts>({});
  const [demoReset, setDemoReset] = useState(true);
  const [today, setToday] = useState("");
  const [storage, setStorage] = useState<Session["storage"]>();
  const [live, setLive] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date>();
  const [busyId, setBusyId] = useState<string>();
  const [actionError, setActionError] = useState("");
  const inFlight = useRef(false);
  // Bumped when a status change starts and ends. A poll that overlaps a change drops its stale list.
  const edits = useRef(0);
  const restart = useRef<() => void>(() => undefined);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    const startedAt = edits.current;
    try {
      const res = await fetch("/api/bookings", { cache: "no-store" });
      if (res.status === 401) {
        // The cookie expired. Ask the session again, so the login form keeps its dev hint.
        restart.current();
        return;
      }
      const data = (await res.json()) as Live;
      if (!data.ok) throw new Error("not ok");
      if (startedAt !== edits.current) return;
      setBookings(data.bookings);
      setWaiting(data.needsAction ?? data.bookings.filter(isWaiting));
      setSources(data.sources ?? {});
      setToday(data.today);
      setStorage(data.storage);
      setUpdatedAt(new Date());
      setLive(true);
    } catch {
      setLive(false);
    } finally {
      inFlight.current = false;
    }
  }, []);

  const apply = useCallback(
    (s: Session) => {
      if (!s.configured) setView({ kind: "off" });
      else if (!s.authed) setView({ kind: "login", devPassword: s.devPassword });
      else {
        setView({ kind: "in" });
        setDemoReset(s.demoReset !== false);
        void load();
      }
    },
    [load],
  );

  const start = useCallback(() => {
    fetchSession().then(apply, () => setView({ kind: "error", message: "Could not reach the server. Reload the page to try again." }));
  }, [apply]);

  // The static page asks the API who is looking, once, in the browser.
  useEffect(() => {
    restart.current = start;
    start();
  }, [start]);

  useEffect(() => {
    if (view.kind !== "in") return;
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [view.kind, load]);

  /** Puts an updated booking into both live lists: it leaves Needs action once it no longer waits on staff. */
  function merge(updated: Booking) {
    // Keep the row's WhatsApp line. The next poll brings the new one, sent after this response.
    setBookings((list) => list.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)));
    setWaiting((list) => list.flatMap((b) => (b.id !== updated.id ? [b] : isWaiting(updated) ? [{ ...b, ...updated }] : [])));
  }

  async function patch(id: string, body: unknown): Promise<{ booking?: Booking; error?: string }> {
    setBusyId(id);
    setActionError("");
    edits.current += 1;
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.status === 401) {
        start();
        return { error: "Logged out." };
      }
      const data = (await res.json()) as { ok: boolean; booking?: Booking; error?: string };
      if (!data.ok || !data.booking) return { error: data.error ?? "Could not update that booking. Try again." };
      merge(data.booking);
      return { booking: data.booking };
    } catch {
      return { error: "Could not update that booking. Try again." };
    } finally {
      edits.current += 1;
      setBusyId(undefined);
    }
  }

  async function setStatus(id: string, status: BookingStatus): Promise<DashboardBooking | void> {
    const { booking, error } = await patch(id, { status });
    if (error) setActionError(error);
    return booking;
  }

  async function reschedule(id: string, date: string, slot: string) {
    const { error } = await patch(id, { date, slot });
    return error ?? null;
  }

  /** Fresh live data now: waits for a poll in flight, then loads. */
  async function refresh() {
    edits.current += 1;
    for (let i = 0; i < 40 && inFlight.current; i++) await new Promise((r) => setTimeout(r, 50));
    await load();
  }

  // On-demand loads that find the cookie expired send the dashboard back to the login (through an event, see below).
  const api = useMemo(() => onLoggedOut(httpAdminApi, () => window.dispatchEvent(new Event(LOGGED_OUT_EVENT))), []);
  useEffect(() => {
    const again = () => restart.current();
    window.addEventListener(LOGGED_OUT_EVENT, again);
    return () => window.removeEventListener(LOGGED_OUT_EVENT, again);
  }, []);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined);
    setBookings([]);
    setWaiting([]);
    setLive(false);
    start();
  }

  switch (view.kind) {
    case "loading":
      return <p className="py-10 text-center">Loading the dashboard…</p>;
    case "error":
      return (
        <p role="alert" className={card}>
          {view.message}
        </p>
      );
    case "off":
      return (
        <div className={card}>
          <h2 className="text-2xl font-semibold tracking-tight text-lotus-text">Dashboard not configured</h2>
          <p className="mt-2">The clinic dashboard needs a password on the server. Set ADMIN_PASSWORD, then reload this page.</p>
        </div>
      );
    case "login":
      return <Login devPassword={view.devPassword} onDone={start} />;
    case "in":
      if (!today) return <p className="py-10 text-center">{live ? "Loading bookings…" : "Loading bookings… If this takes long, reload the page."}</p>;
      return (
        <>
          {actionError ? (
            <p role="alert" className="mb-4 rounded-2xl bg-white p-4 text-sm font-semibold text-lotus-error ring-1 ring-lotus-error">
              {actionError}
            </p>
          ) : null}
          <Dashboard
            bookings={bookings}
            needsAction={waiting}
            sources={sources}
            today={today}
            storage={storage}
            live={live}
            updatedAt={updatedAt}
            busyId={busyId}
            bookHref={bookHref}
            onStatus={setStatus}
            onReschedule={reschedule}
            onRefresh={refresh}
            onLogout={() => void logout()}
            optIn={optIn}
            api={api}
            demoReset={demoReset}
          />
        </>
      );
  }
}
