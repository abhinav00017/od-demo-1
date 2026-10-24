"use client";

import { Check, Clock, Phone, Plus } from "lucide-react";
import { useState } from "react";
import { formatInr, formatPhone } from "@/lib/crm/math";
import { api, ApiError } from "./api";
import { dayTime, Empty, ErrorNote, Initial, QuoteBadge, relativeDay } from "./bits";
import { NewLeadDialog } from "./LeadForm";
import { AnimatePresence, Reveal, Row } from "./Motion";
import { go } from "./nav";
import type { TodayData } from "./types";
import { ui } from "./ui";
import { useApi } from "./useApi";

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className={`p-4 sm:p-5 ${ui.card}`}>
      <p className="text-3xl font-bold tracking-tight text-ink tabular-nums">{value}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{label}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted">{sub}</p> : null}
    </div>
  );
}

/** Today: the numbers, the calls due, and what happened lately. */
export function Today() {
  const { data, error, reload } = useApi<TodayData>("/api/crm/today");
  const [busy, setBusy] = useState<string>();
  const [actionError, setActionError] = useState("");
  const [adding, setAdding] = useState(false);

  async function act(id: string, body: { action: "done" } | { action: "snooze"; days: number }) {
    setBusy(id);
    setActionError("");
    try {
      await api(`/api/crm/followups/${id}`, { method: "PATCH", body });
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not update that follow-up.");
    } finally {
      setBusy(undefined);
    }
  }

  if (!data) return error ? <ErrorNote message={error} /> : <p className="py-10 text-center text-muted">Loading today…</p>;
  const { counts, due, activity } = data;

  return (
    <Reveal>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Today</h1>
          <p className="mt-1 text-muted">
            {new Date(`${data.today}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
          </p>
        </div>
        <button type="button" className={ui.primary} onClick={() => setAdding(true)}>
          <Plus aria-hidden className="size-4" strokeWidth={2.5} />
          New lead
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Stat label="New leads" sub="this week" value={counts.newLeadsThisWeek} />
        <Stat label="Open quotes" sub="draft or sent" value={counts.openQuotes} />
        <Stat label="Sold" sub={`this month · ${formatInr(counts.soldValueThisMonth)}`} value={counts.soldThisMonth} />
        <Stat label="Calls due" sub="today and overdue" value={counts.dueToday} />
      </div>

      <section aria-labelledby="due-today" className="mt-8">
        <h2 id="due-today" className={ui.h2}>
          Due today
        </h2>
        {actionError ? (
          <div className="mt-3">
            <ErrorNote message={actionError} />
          </div>
        ) : null}
        {due.length === 0 ? (
          <div className="mt-3">
            <Empty>No calls due. Quiet leads with a sent quote get a WhatsApp reminder after 2 days, and a call shows up here.</Empty>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            <AnimatePresence initial={false}>
              {due.map((f) => {
                const overdue = relativeDay(f.dueAt) !== "today";
                return (
                  <Row key={f.id} className={`p-4 ${ui.card}`}>
                    <div className="flex items-start gap-3">
                      <Initial name={f.lead.name} />
                      <div className="min-w-0 flex-1">
                        <button type="button" onClick={() => go({ v: "lead", id: f.leadId })} className="text-left font-semibold text-ink hover:text-crm-accent">
                          {f.lead.name}
                        </button>
                        <p className="text-sm text-muted tabular-nums">{formatPhone(f.lead.phone)}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${overdue ? "bg-crm-warn-soft text-crm-warn" : "bg-crm-soft text-crm-accent"}`}>
                            <Clock aria-hidden className="size-3.5" strokeWidth={2.2} />
                            {overdue ? `Overdue, due ${relativeDay(f.dueAt)}` : "Due today"}
                          </span>
                          {f.quote ? (
                            <span className="inline-flex items-center gap-1.5 text-muted">
                              {f.quote.number} · {formatInr(f.quote.total)} <QuoteBadge status={f.quote.status} />
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <a href={`tel:+91${f.lead.phone}`} className={ui.secondary}>
                        <Phone aria-hidden className="size-4" strokeWidth={2} />
                        Call
                      </a>
                      <button type="button" disabled={busy === f.id} onClick={() => void act(f.id, { action: "done" })} className={ui.secondary}>
                        <Check aria-hidden className="size-4" strokeWidth={2.5} />
                        Done
                      </button>
                      <button type="button" disabled={busy === f.id} onClick={() => void act(f.id, { action: "snooze", days: 2 })} aria-label="Snooze 2 days" className={ui.secondary.replace("px-4", "px-2")}>
                        <span>
                          Snooze<span className="hidden sm:inline"> 2 days</span>
                          <span className="sm:hidden"> 2d</span>
                        </span>
                      </button>
                    </div>
                  </Row>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </section>

      <section aria-labelledby="activity" className="mt-8">
        <h2 id="activity" className={ui.h2}>
          Recent activity
        </h2>
        {activity.length === 0 ? (
          <div className="mt-3">
            <Empty>Nothing yet.</Empty>
          </div>
        ) : (
          <ul className={`mt-3 divide-y divide-line ${ui.card}`}>
            {activity.map((a) => (
              <li key={`${a.kind}-${a.leadId}-${a.at}`}>
                <button type="button" onClick={() => go({ v: "lead", id: a.leadId })} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-canvas">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink">{a.leadName}</span>
                    <span className="block truncate text-sm text-muted">{a.text}</span>
                  </span>
                  <span suppressHydrationWarning className="shrink-0 text-xs text-muted">
                    {dayTime(a.at)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.storage === "memory" ? (
        <p className="mt-8 text-xs text-muted">Demo data lives in server memory and resets when the server restarts.</p>
      ) : null}

      <NewLeadDialog open={adding} onClose={() => setAdding(false)} />
    </Reveal>
  );
}
