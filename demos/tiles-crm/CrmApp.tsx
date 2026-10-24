"use client";

import { CalendarCheck, Lock, LogOut, Package, UserRoundCheck, Users } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import { KALYANI } from "@/lib/crm/shop";
import { api, ApiError, setUnauthorisedHandler } from "./api";
import { Customers } from "./Customers";
import { LeadDetail } from "./LeadDetail";
import { Leads } from "./Leads";
import { CrmMotion } from "./Motion";
import { go, readView, viewQuery, type View } from "./nav";
import { Products } from "./Products";
import { QuoteBuilder } from "./QuoteBuilder";
import { Today } from "./Today";
import { ui } from "./ui";

type Session = { configured: boolean; devPassword: boolean; authed: boolean };
type Gate = { kind: "loading" } | { kind: "error" } | { kind: "off" } | { kind: "login"; devPassword: boolean } | { kind: "in" };

const box = `mx-auto mt-10 max-w-md p-6 sm:mt-16 sm:p-8 ${ui.card}`;

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
      await api("/api/crm/login", { method: "POST", body: { password } });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not log in. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className={box} aria-label="CRM login">
      <span aria-hidden className="flex size-11 items-center justify-center rounded-full bg-crm-soft">
        <Lock strokeWidth={1.9} className="size-5 text-crm-accent" />
      </span>
      <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">{KALYANI.name}</h1>
      <p className="mt-1.5 text-muted">Staff login for leads, quotes and follow-ups.</p>
      {devPassword ? (
        <p className="mt-4 rounded-xl bg-crm-soft p-4 text-sm text-ink">
          Demo mode: CRM_ADMIN_PASSWORD is not set, so the password is <strong>demo</strong>.
        </p>
      ) : null}
      <label htmlFor={`${id}-pw`} className={`mt-5 ${ui.label}`}>
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
        <p id={`${id}-err`} role="alert" className={ui.error}>
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={busy || !password} className={`mt-5 w-full ${ui.primary}`}>
        {busy ? "Checking…" : "Log in"}
      </button>
    </form>
  );
}

const TABS = [
  { v: "today", label: "Today", icon: CalendarCheck },
  { v: "leads", label: "Leads", icon: Users },
  { v: "customers", label: "Customers", icon: UserRoundCheck },
  { v: "products", label: "Products", icon: Package },
] as const;

/** Which tab a screen sits under. A lead or quote opened from Customers still reads as Leads; that is fine. */
function tabOf(view: View) {
  return view.v === "lead" || view.v === "quote" ? "leads" : view.v;
}

function Screen({ view }: { view: View }) {
  switch (view.v) {
    case "today":
      return <Today />;
    case "leads":
      return <Leads />;
    case "lead":
      return <LeadDetail key={view.id} id={view.id} />;
    case "quote":
      return <QuoteBuilder key={view.id ?? `new-${view.lead}`} quoteId={view.id} leadId={view.lead} />;
    case "products":
      return <Products />;
    case "customers":
      return <Customers />;
  }
}

function Shell({ onLogout }: { onLogout: () => void }) {
  const params = useSearchParams();
  const view = readView(params);
  const tab = tabOf(view);
  return (
    <div className="min-h-dvh bg-canvas pb-16">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pt-4 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-base font-bold tracking-tight text-ink sm:text-lg">{KALYANI.name}</p>
            <p className="text-xs font-semibold tracking-wide text-crm-accent uppercase">CRM</p>
          </div>
          <button type="button" onClick={onLogout} className={ui.quiet}>
            <LogOut aria-hidden className="size-4" strokeWidth={2} />
            Log out
          </button>
        </div>
        <nav aria-label="CRM" className="mx-auto max-w-5xl px-2 sm:px-4">
          <ul className="flex gap-0.5 overflow-x-auto [scrollbar-width:none] sm:gap-1">
            {TABS.map((t) => {
              const on = tab === t.v;
              const Icon = t.icon;
              return (
                <li key={t.v}>
                  <a
                    href={viewQuery({ v: t.v }) || "?"}
                    aria-current={on ? "page" : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      go({ v: t.v });
                    }}
                    className={`flex min-h-12 items-center gap-2 border-b-2 px-2.5 text-sm font-semibold whitespace-nowrap transition sm:px-3 ${on ? "border-crm-accent text-crm-accent" : "border-transparent text-muted hover:text-ink"}`}
                  >
                    <Icon aria-hidden className="hidden size-4 sm:block" strokeWidth={2} />
                    {t.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 sm:pt-8">
        <Screen view={view} />
      </main>
    </div>
  );
}

/** The CRM: password gate, then the app. Everything loads in the browser, so the page itself stays static. */
export function CrmApp() {
  const [gate, setGate] = useState<Gate>({ kind: "loading" });

  const start = useCallback(() => {
    api<Session>("/api/crm/session").then(
      (s) => setGate(!s.configured ? { kind: "off" } : s.authed ? { kind: "in" } : { kind: "login", devPassword: s.devPassword }),
      () => setGate({ kind: "error" }),
    );
  }, []);

  useEffect(() => {
    setUnauthorisedHandler(start);
    start();
  }, [start]);

  async function logout() {
    await fetch("/api/crm/logout", { method: "POST" }).catch(() => undefined);
    start();
  }

  return (
    <CrmMotion>
      {gate.kind === "loading" ? (
        <p className="py-16 text-center text-muted">Loading the CRM…</p>
      ) : gate.kind === "error" ? (
        <p role="alert" className={box}>
          Could not reach the server. Reload the page to try again.
        </p>
      ) : gate.kind === "off" ? (
        <div className={box}>
          <h1 className="text-2xl font-bold tracking-tight text-ink">CRM not configured</h1>
          <p className="mt-2 text-muted">The CRM needs a password on the server. Set CRM_ADMIN_PASSWORD, then reload this page.</p>
        </div>
      ) : gate.kind === "login" ? (
        <Login devPassword={gate.devPassword} onDone={start} />
      ) : (
        <Shell onLogout={() => void logout()} />
      )}
    </CrmMotion>
  );
}
