"use client";

import { Plus, Search } from "lucide-react";
import { useId, useState } from "react";
import { formatInr, formatPhone } from "@/lib/crm/math";
import type { LeadStatus } from "@/lib/crm/types";
import { Chips, Empty, ErrorNote, Initial, LeadBadge, QuoteBadge, relativeDay } from "./bits";
import { NewLeadDialog, sourceLabel } from "./LeadForm";
import { AnimatePresence, m, Reveal, Row } from "./Motion";
import { go } from "./nav";
import type { LeadRow, LeadsData } from "./types";
import { ui } from "./ui";
import { useApi } from "./useApi";

type Filter = "all" | LeadStatus;

/** Name or digits of the number. Three digits or more match anywhere in the number. */
export function matchesLead(lead: Pick<LeadRow, "name" | "phone">, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  return lead.name.toLowerCase().includes(q) || (digits.length >= 3 && lead.phone.includes(digits));
}

/** Leads: search by name or number, filter by status, add a new one. */
export function Leads() {
  const id = useId();
  const { data, error } = useApi<LeadsData>("/api/crm/leads");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [adding, setAdding] = useState(false);

  if (!data) return error ? <ErrorNote message={error} /> : <p className="py-10 text-center text-muted">Loading leads…</p>;
  const rows = data.leads.filter((l) => (filter === "all" || l.status === filter) && matchesLead(l, query));
  const c = data.counts;

  return (
    <Reveal>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Leads</h1>
        <button type="button" className={ui.primary} onClick={() => setAdding(true)}>
          <Plus aria-hidden className="size-4" strokeWidth={2.5} />
          New lead
        </button>
      </div>

      <div className="relative mt-5">
        <label htmlFor={`${id}-q`} className="sr-only">
          Search leads by name or number
        </label>
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" strokeWidth={2} />
        <input id={`${id}-q`} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or number" className={`${ui.input.replace("mt-1.5 ", "")} pl-11`} />
      </div>
      <div className="mt-3">
        <Chips
          label="Status"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `All ${c.all}` },
            { value: "lead", label: `Leads ${c.lead}` },
            { value: "customer", label: `Customers ${c.customer}` },
            { value: "lost", label: `Lost ${c.lost}` },
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <div className="mt-5">
          <Empty>{query ? `No lead matches "${query}".` : "No leads here yet."}</Empty>
        </div>
      ) : (
        <m.ul layout className={`mt-5 divide-y divide-line overflow-hidden ${ui.card}`} aria-label="Leads">
          <AnimatePresence initial={false}>
            {rows.map((l) => (
              <Row key={l.id}>
                <button type="button" onClick={() => go({ v: "lead", id: l.id })} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-canvas">
                  <Initial name={l.name} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold text-ink">{l.name}</span>
                      <LeadBadge status={l.status} />
                    </span>
                    <span className="block truncate text-sm text-muted tabular-nums">
                      {formatPhone(l.phone)} · {sourceLabel(l.source)} · <span suppressHydrationWarning>{relativeDay(l.createdAt)}</span>
                    </span>
                  </span>
                  {l.latestQuote ? (
                    <span className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                      <span className="text-sm font-semibold text-ink tabular-nums">{formatInr(l.latestQuote.total)}</span>
                      <span className="flex items-center gap-1.5 text-xs text-muted">
                        {l.latestQuote.number} <QuoteBadge status={l.latestQuote.status} />
                      </span>
                    </span>
                  ) : (
                    <span className="hidden shrink-0 text-xs text-muted sm:block">No quote yet</span>
                  )}
                </button>
              </Row>
            ))}
          </AnimatePresence>
        </m.ul>
      )}

      <NewLeadDialog open={adding} onClose={() => setAdding(false)} />
    </Reveal>
  );
}
