"use client";

import { ArrowLeft, Check, FilePlus2, MessageCircle, Phone, RotateCcw, UserX } from "lucide-react";
import { useState } from "react";
import { formatInr, formatPhone } from "@/lib/crm/math";
import type { CrmMessage, Followup } from "@/lib/crm/types";
import { api, ApiError } from "./api";
import { dayTime, Empty, ErrorNote, Initial, LeadBadge, QuoteBadge, relativeDay, shortDay } from "./bits";
import { sourceLabel } from "./LeadForm";
import { Reveal } from "./Motion";
import { go } from "./nav";
import type { LeadData } from "./types";
import { ui } from "./ui";
import { useApi } from "./useApi";

const MESSAGE_LABEL: Record<CrmMessage["kind"], string> = { quote_sent: "Quote sent", crm_reminder: "Reminder" };

function followupLabel(f: Followup) {
  if (f.kind === "auto_whatsapp") return `WhatsApp reminder ${f.result === "failed" ? "failed" : "sent"}`;
  if (f.doneAt) return f.result ? `Call: ${f.result}` : "Call done";
  return `Call due ${relativeDay(f.dueAt)}`;
}

/** One lead: details, quotes, follow-ups and WhatsApp messages, with the actions staff need at the counter. */
export function LeadDetail({ id }: { id: string }) {
  const { data, error, reload } = useApi<LeadData>(`/api/crm/leads/${id}`);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setActionError("");
    try {
      await fn();
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "That did not work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!data) return error ? <ErrorNote message={error} /> : <p className="py-10 text-center text-muted">Loading the lead…</p>;
  const { lead, quotes, followups, messages } = data;
  const open = followups.filter((f) => !f.doneAt);
  const done = followups.filter((f) => f.doneAt).sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));

  return (
    <Reveal>
      <button type="button" onClick={() => go({ v: lead.status === "customer" ? "customers" : "leads" })} className={`-ml-3 ${ui.quiet}`}>
        <ArrowLeft aria-hidden className="size-4" strokeWidth={2} />
        {lead.status === "customer" ? "Customers" : "Leads"}
      </button>

      <section className={`mt-2 p-5 sm:p-6 ${ui.card}`}>
        <div className="flex items-start gap-4">
          <Initial name={lead.name} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-ink">{lead.name}</h1>
              <LeadBadge status={lead.status} />
            </div>
            <p className="mt-1 text-muted tabular-nums">{formatPhone(lead.phone)}</p>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted">Came in by</dt>
            <dd className="font-semibold text-ink">{sourceLabel(lead.source)}</dd>
          </div>
          <div>
            <dt className="text-muted">Added</dt>
            <dd className="font-semibold text-ink">{shortDay(lead.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-muted">Last contact</dt>
            <dd suppressHydrationWarning className="font-semibold text-ink">
              {relativeDay(lead.lastContactAt)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">{lead.convertedAt ? "Customer since" : "Next follow-up"}</dt>
            <dd suppressHydrationWarning className="font-semibold text-ink">
              {lead.convertedAt ? shortDay(lead.convertedAt) : lead.nextFollowUpAt ? relativeDay(lead.nextFollowUpAt) : "None"}
            </dd>
          </div>
        </dl>
        {lead.notes ? <p className="mt-5 rounded-xl bg-canvas p-4 text-sm text-ink">{lead.notes}</p> : null}

        <div className="mt-5 flex flex-wrap gap-2">
          {lead.status !== "lost" ? (
            <button type="button" className={ui.primary} onClick={() => go({ v: "quote", lead: lead.id })}>
              <FilePlus2 aria-hidden className="size-4" strokeWidth={2} />
              New quote
            </button>
          ) : null}
          <a href={`tel:+91${lead.phone}`} className={ui.secondary}>
            <Phone aria-hidden className="size-4" strokeWidth={2} />
            Call
          </a>
          {lead.status === "lead" ? (
            <>
              <button type="button" disabled={busy} className={ui.secondary} onClick={() => void run(() => api(`/api/crm/leads/${lead.id}/followups`, { method: "POST", body: { inDays: 2 } }))}>
                Follow up in 2 days
              </button>
              <button type="button" disabled={busy} className={ui.quiet} onClick={() => void run(() => api(`/api/crm/leads/${lead.id}`, { method: "PATCH", body: { status: "lost" } }))}>
                <UserX aria-hidden className="size-4" strokeWidth={2} />
                Mark lost
              </button>
            </>
          ) : null}
          {lead.status === "lost" ? (
            <button type="button" disabled={busy} className={ui.secondary} onClick={() => void run(() => api(`/api/crm/leads/${lead.id}`, { method: "PATCH", body: { status: "lead" } }))}>
              <RotateCcw aria-hidden className="size-4" strokeWidth={2} />
              Reopen lead
            </button>
          ) : null}
        </div>
        {actionError ? (
          <div className="mt-4">
            <ErrorNote message={actionError} />
          </div>
        ) : null}
      </section>

      <section aria-labelledby="lead-quotes" className="mt-8">
        <h2 id="lead-quotes" className={ui.h2}>
          Quotes
        </h2>
        {quotes.length === 0 ? (
          <div className="mt-3">
            <Empty>No quotes yet.</Empty>
          </div>
        ) : (
          <ul className={`mt-3 divide-y divide-line overflow-hidden ${ui.card}`}>
            {quotes.map((q) => (
              <li key={q.id}>
                <button type="button" onClick={() => go({ v: "quote", id: q.id })} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-canvas">
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-semibold text-ink">
                      {q.number} <QuoteBadge status={q.status} />
                    </span>
                    <span className="block text-sm text-muted">
                      {q.soldAt ? `Sold ${shortDay(q.soldAt)}` : q.sentAt ? `Sent ${shortDay(q.sentAt)}` : `Made ${shortDay(q.createdAt)}`}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold text-ink tabular-nums">{formatInr(q.total)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="lead-followups" className="mt-8">
        <h2 id="lead-followups" className={ui.h2}>
          Follow-ups
        </h2>
        {followups.length === 0 ? (
          <div className="mt-3">
            <Empty>No follow-ups.</Empty>
          </div>
        ) : (
          <ul className={`mt-3 divide-y divide-line ${ui.card}`}>
            {[...open, ...done].map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span suppressHydrationWarning className={`text-sm ${f.doneAt ? "text-muted" : "font-semibold text-ink"}`}>
                  {followupLabel(f)}
                  {f.doneAt ? <span className="ml-2 text-xs">{dayTime(f.doneAt)}</span> : null}
                </span>
                {!f.doneAt ? (
                  <span className="flex gap-2">
                    <button type="button" disabled={busy} className={ui.secondary} onClick={() => void run(() => api(`/api/crm/followups/${f.id}`, { method: "PATCH", body: { action: "done" } }))}>
                      <Check aria-hidden className="size-4" strokeWidth={2.5} />
                      Done
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className={ui.secondary}
                      onClick={() => void run(() => api(`/api/crm/followups/${f.id}`, { method: "PATCH", body: { action: "snooze", days: 2 } }))}
                    >
                      Snooze 2 days
                    </button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="lead-whatsapp" className="mt-8">
        <h2 id="lead-whatsapp" className={ui.h2}>
          WhatsApp
        </h2>
        {messages.length === 0 ? (
          <div className="mt-3">
            <Empty>Nothing sent on WhatsApp yet.</Empty>
          </div>
        ) : (
          <ul className={`mt-3 divide-y divide-line ${ui.card}`}>
            {messages.map((msg) => (
              <li key={msg.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <MessageCircle aria-hidden className="size-4 shrink-0 text-crm-accent" strokeWidth={2} />
                <span className="min-w-0 flex-1">
                  <span className="font-semibold text-ink">{MESSAGE_LABEL[msg.kind]}</span>
                  <span className={msg.status === "failed" ? "font-semibold text-crm-error" : "text-muted"}>
                    {" "}
                    · {msg.status}
                    {msg.error ? `: ${msg.error}` : ""}
                    {msg.provider === "fake" ? " (demo, not delivered)" : msg.provider === "twilio" ? " via Twilio" : ""}
                  </span>
                </span>
                <span suppressHydrationWarning className="shrink-0 text-xs text-muted">
                  {dayTime(msg.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Reveal>
  );
}
