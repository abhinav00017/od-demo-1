import type { Mock } from "@/lib/schema";
import { BrowserFrame } from "./Frames";

type Leads = Extract<Mock, { kind: "leads" }>;

const STATUS: Record<Leads["leads"][number]["status"], { label: string; className: string }> = {
  new: { label: "New", className: "bg-brand-soft text-brand" },
  "follow-up": { label: "Follow-up due", className: "bg-chip text-ink" },
  "visit-booked": { label: "Site visit booked", className: "bg-lotus-mint text-lotus-teal-deep" },
  "brochure-opened": { label: "Brochure opened", className: "bg-canvas text-muted" },
};

/** A developer's lead list: a few totals, then each enquiry with its source and where it stands. */
export function LeadsMock({ mock }: { mock: Leads }) {
  return (
    <BrowserFrame url={`Lead dashboard · ${mock.name}`}>
      <div className="bg-white p-5 sm:p-6">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">{mock.period}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {mock.stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-canvas px-3 py-3">
              <p className="text-xl font-bold text-ink tabular-nums">{s.value}</p>
              <p className="mt-0.5 text-[11px] leading-tight text-muted">{s.label}</p>
            </div>
          ))}
        </div>
        <ul className="mt-5 divide-y divide-line">
          {mock.leads.map((lead) => {
            const status = STATUS[lead.status];
            return (
              <li key={lead.name} className="flex items-center gap-3 py-3">
                <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chip text-sm font-bold text-ink">
                  {lead.name.charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{lead.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {lead.source} · {lead.interest}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${status.className}`}>{status.label}</span>
                  <span className="text-[11px] text-muted">{lead.when}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </BrowserFrame>
  );
}
