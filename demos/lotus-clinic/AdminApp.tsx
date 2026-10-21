"use client";

import { Lock } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { Booking, BookingStatus, DashboardBooking } from "@/lib/bookings/types";
import { Dashboard, type DeskOptIn } from "./Dashboard";
import { buttonClass, fieldClass, labelClass, panelClass } from "./ui";

/** How often the dashboard asks for new bookings. */
export const POLL_MS = 5000;

type Session = { configured: boolean; devPassword: boolean; authed: boolean; storage?: "memory" | "postgres" };
type View = { kind: "loading" } | { kind: "error"; message: string } | { kind: "off" } | { kind: "login"; devPassword: boolean } | { kind: "in" };

async function fetchSession(): Promise<Session> {
  const res = await fetch("/api/admin/session", { cache: "no-store" });
  return (await res.json()) as Session;
}

const card = `mx-auto max-w-md p-6 sm:p-10 ${panelClass}`;

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
      <Lock aria-hidden className="size-5 text-lotus-forest" strokeWidth={1.75} />
      <h2 className="mt-5 font-lotus-serif text-3xl tracking-[-0.02em] text-lotus-text">Clinic staff only</h2>
      <p className="mt-2">Enter the clinic password to see bookings.</p>
      {devPassword ? (
        <p className="mt-6 border-l-2 border-lotus-forest py-0.5 pl-4 text-sm text-lotus-text">
          Development mode: ADMIN_PASSWORD is not set, so the password is <strong>demo</strong>.
        </p>
      ) : null}
      <label htmlFor={`${id}-pw`} className={`mt-8 block ${labelClass}`}>
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
        className={fieldClass}
      />
      {error ? (
        <p id={`${id}-err`} role="alert" className="mt-2 text-sm font-medium text-lotus-error">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={busy || !password} className={`mt-6 w-full ${buttonClass}`}>
        {busy ? "Checking…" : "Log in"}
      </button>
    </form>
  );
}

/** Password gate plus the live bookings view. Everything loads in the browser, so the page itself stays static. */
export function AdminApp({ bookHref, optIn }: { bookHref: string; optIn?: DeskOptIn | null }) {
  const [view, setView] = useState<View>({ kind: "loading" });
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
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
      const data = (await res.json()) as { ok: boolean; today: string; storage: Session["storage"]; bookings: DashboardBooking[] };
      if (!data.ok) throw new Error("not ok");
      if (startedAt !== edits.current) return;
      setBookings(data.bookings);
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

  async function setStatus(id: string, status: BookingStatus) {
    setBusyId(id);
    setActionError("");
    edits.current += 1;
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (res.status === 401) return start();
      const data = (await res.json()) as { ok: boolean; booking?: Booking; error?: string };
      if (!data.ok || !data.booking) throw new Error(data.error);
      const updated = data.booking;
      // Keep the row's WhatsApp line. The next poll brings the new one, sent after this response.
      setBookings((list) => list.map((b) => (b.id === id ? { ...b, ...updated } : b)));
    } catch {
      setActionError("Could not update that booking. Try again.");
    } finally {
      edits.current += 1;
      setBusyId(undefined);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined);
    setBookings([]);
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
          <h2 className="font-lotus-serif text-3xl tracking-[-0.02em] text-lotus-text">Dashboard not configured</h2>
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
            <p role="alert" className="mb-6 border-l-2 border-lotus-error py-0.5 pl-4 text-sm font-medium text-lotus-error">
              {actionError}
            </p>
          ) : null}
          <Dashboard
            bookings={bookings}
            today={today}
            storage={storage}
            live={live}
            updatedAt={updatedAt}
            busyId={busyId}
            bookHref={bookHref}
            onStatus={(id, s) => void setStatus(id, s)}
            onLogout={() => void logout()}
            optIn={optIn}
          />
        </>
      );
  }
}
