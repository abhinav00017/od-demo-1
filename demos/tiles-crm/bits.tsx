"use client";

import type { LeadStatus, QuoteStatus } from "@/lib/crm/types";

const LEAD_STYLE: Record<LeadStatus, { label: string; className: string }> = {
  lead: { label: "Lead", className: "bg-crm-soft text-crm-accent" },
  customer: { label: "Customer", className: "bg-crm-ok-soft text-crm-ok" },
  lost: { label: "Lost", className: "bg-chip text-muted" },
};

const QUOTE_STYLE: Record<QuoteStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-chip text-ink" },
  sent: { label: "Sent", className: "bg-crm-soft text-crm-accent" },
  sold: { label: "Sold", className: "bg-crm-ok-soft text-crm-ok" },
  lost: { label: "Lost", className: "bg-chip text-muted" },
};

const pill = "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold";

export function LeadBadge({ status }: { status: LeadStatus }) {
  const s = LEAD_STYLE[status];
  return <span className={`${pill} ${s.className}`}>{s.label}</span>;
}

export function QuoteBadge({ status }: { status: QuoteStatus }) {
  const s = QUOTE_STYLE[status];
  return <span className={`${pill} ${s.className}`}>{s.label}</span>;
}

/** A row of filter chips. One is pressed at a time. */
export function Chips<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`min-h-9 shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap transition ${on ? "bg-crm-accent text-white" : "bg-white text-ink ring-1 ring-line hover:ring-crm-accent"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const TZ = "Asia/Kolkata";

/** "24 Oct". */
export function shortDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: TZ });
}

/** "24 Oct, 4:05 pm". */
export function dayTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: TZ });
}

/** "today", "yesterday", "3 days ago", "in 2 days". Calendar days in India. */
export function relativeDay(iso: string, now: Date = new Date()) {
  const day = (d: Date) => Date.parse(new Date(d.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10));
  const diff = Math.round((day(new Date(iso)) - day(now)) / 86_400_000);
  if (diff === 0) return "today";
  if (diff === -1) return "yesterday";
  if (diff === 1) return "tomorrow";
  return diff < 0 ? `${-diff} days ago` : `in ${diff} days`;
}

export function Initial({ name }: { name: string }) {
  return (
    <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-crm-soft text-sm font-bold text-crm-accent">
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border-2 border-dashed border-line px-5 py-8 text-center text-sm text-muted">{children}</p>;
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-crm-error ring-1 ring-crm-error">
      {message}
    </p>
  );
}
