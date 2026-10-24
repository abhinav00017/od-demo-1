/** What the CRM API answers, as the screens read it. */
import type { CrmMessage, Followup, Lead, LeadStatus, Product, Quote, QuoteStatus, QuoteWithItems } from "@/lib/crm/types";
import type { Activity, TodayCounts } from "@/lib/crm/service";

export type QuoteRef = { id: string; number: string; status: QuoteStatus; total: number };

export type TodayData = {
  ok: true;
  today: string;
  storage: "memory" | "postgres";
  counts: TodayCounts;
  due: (Followup & { lead: Lead; quote: QuoteRef | null })[];
  activity: Activity[];
};

export type LeadRow = Lead & { quoteCount: number; latestQuote: QuoteRef | null };
export type LeadsData = { ok: true; leads: LeadRow[]; counts: Record<"all" | LeadStatus, number> };
export type LeadData = { ok: true; lead: Lead; quotes: Quote[]; followups: Followup[]; messages: CrmMessage[] };
export type ProductsData = { ok: true; products: Product[] };
export type QuoteData = { ok: true; quote: QuoteWithItems; lead: Lead | null };
export type CustomersData = { ok: true; customers: (Lead & { quotes: Quote[]; spent: number })[] };
