"use client";

import { formatInr, formatPhone } from "@/lib/crm/math";
import { Empty, ErrorNote, Initial, QuoteBadge, shortDay } from "./bits";
import { Reveal } from "./Motion";
import { go } from "./nav";
import type { CustomersData } from "./types";
import { ui } from "./ui";
import { useApi } from "./useApi";

/** Customers: leads that bought, with every quote they have and what they spent. */
export function Customers() {
  const { data, error } = useApi<CustomersData>("/api/crm/customers");
  if (!data) return error ? <ErrorNote message={error} /> : <p className="py-10 text-center text-muted">Loading customers…</p>;
  const spent = data.customers.reduce((sum, c) => sum + c.spent, 0);
  return (
    <Reveal>
      <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Customers</h1>
      <p className="mt-1 text-muted">
        {data.customers.length} {data.customers.length === 1 ? "customer" : "customers"} · {formatInr(spent)} sold
      </p>
      {data.customers.length === 0 ? (
        <div className="mt-5">
          <Empty>No customers yet. Mark a quote sold and the lead shows up here.</Empty>
        </div>
      ) : (
        <ul className="mt-5 space-y-3" aria-label="Customers">
          {data.customers.map((c) => (
            <li key={c.id} className={`p-4 ${ui.card}`}>
              <button type="button" onClick={() => go({ v: "lead", id: c.id })} className="flex w-full items-center gap-3 text-left">
                <Initial name={c.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink">{c.name}</span>
                  <span className="block text-sm text-muted tabular-nums">
                    {formatPhone(c.phone)}
                    {c.convertedAt ? ` · customer since ${shortDay(c.convertedAt)}` : ""}
                  </span>
                </span>
                <span className="shrink-0 font-bold text-ink tabular-nums">{formatInr(c.spent)}</span>
              </button>
              <ul className="mt-3 flex flex-wrap gap-2">
                {c.quotes.map((q) => (
                  <li key={q.id}>
                    <button type="button" onClick={() => go({ v: "quote", id: q.id })} className="inline-flex items-center gap-2 rounded-full bg-canvas px-3 py-1.5 text-sm text-ink hover:ring-1 hover:ring-crm-accent">
                      {q.number} · {formatInr(q.total)} <QuoteBadge status={q.status} />
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </Reveal>
  );
}
