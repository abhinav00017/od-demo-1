/**
 * Owner Ogi's data for the Solstice cafe: read-only questions about the cafe's own enquiries, orders and sales.
 *
 * - Fixed queries: every SQL text below is a constant written here. The model only picks enum values and bounded
 *   numbers (a period, a grouping, a filter, a limit up to 10); it never writes SQL or names a table.
 * - One organization: rows are read through lib/db/botScope.ts. On Postgres that is the read-only ogi_bot role with
 *   app.org_id set to the profile's organization, so row-level security shows only that cafe's rows. Without a
 *   database, the memory rows are filtered by the same rule (scopeMemoryRows). The organization comes from the server's
 *   profile, never from the model or the request.
 * - Aggregates out: counts, shares and rupee totals. The only person-level tool, list_enquiries, returns at most 10
 *   rows with what the owner page already shows, minus the phone number.
 */
import { z } from "zod";
import { EVENT_TYPES, eventTypeLabel, venueById } from "@/demos/solstice-cafe/events";
import { PUBLIC_SOURCES, SOURCE_LABELS } from "@/lib/bookings/sources";
import { getEnquiryStore, type Enquiry, ENQUIRY_STATUSES } from "@/lib/cafeEvents";
import { allMemoryEnquiries } from "@/lib/cafeEvents/memory";
import { addDays } from "@/lib/cafeEvents/validation";
import { getOrderStore, ORDER_CHANNEL_LABELS, ORDER_CHANNELS, type Order } from "@/lib/cafeOrders";
import { allMemoryOrders } from "@/lib/cafeOrders/memory";
import { ORDER_COLUMNS, toOrder, type OrderRow } from "@/lib/cafeOrders/postgres";
import { botQuery, botUsesDatabase, scopeMemoryRows } from "@/lib/db/botScope";
import type { OrgId } from "@/lib/orgs";

// --- Periods: India calendar days, inclusive. ---

export const PERIODS = [
  "today",
  "yesterday",
  "last_7_days",
  "last_30_days",
  "this_week",
  "last_week",
  "next_week",
  "this_month",
  "last_month",
  "next_7_days",
  "next_30_days",
  "all_time",
  "custom",
] as const;
export type Period = (typeof PERIODS)[number];

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const IST_MS = (5 * 60 + 30) * 60 * 1000;
const MAX_CUSTOM_DAYS = 366;

/** Monday of the week holding `day`. */
function monday(day: string) {
  const wd = new Date(`${day}T00:00:00Z`).getUTCDay();
  return addDays(day, -((wd + 6) % 7));
}
function monthStart(day: string) {
  return `${day.slice(0, 8)}01`;
}
function monthEnd(day: string) {
  const [y, m] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

export type Range = { period: Period; from: string; to: string; days: number };

/** The inclusive India day range for a period. `custom` needs from and to (YYYY-MM-DD, at most 366 days). */
export function resolvePeriod(period: Period, today: string, custom: { from?: string; to?: string } = {}): Range | { error: string } {
  let from: string;
  let to: string;
  switch (period) {
    case "today": from = to = today; break;
    case "yesterday": from = to = addDays(today, -1); break;
    case "last_7_days": from = addDays(today, -6); to = today; break;
    case "last_30_days": from = addDays(today, -29); to = today; break;
    case "this_week": from = monday(today); to = addDays(from, 6); break;
    case "last_week": from = addDays(monday(today), -7); to = addDays(from, 6); break;
    case "next_week": from = addDays(monday(today), 7); to = addDays(from, 6); break;
    case "this_month": from = monthStart(today); to = monthEnd(today); break;
    case "last_month": { const prev = addDays(monthStart(today), -1); from = monthStart(prev); to = prev; break; }
    case "next_7_days": from = today; to = addDays(today, 6); break;
    case "next_30_days": from = today; to = addDays(today, 29); break;
    case "all_time": from = "2000-01-01"; to = "2099-12-31"; break;
    case "custom": {
      if (!custom.from || !custom.to || !DAY.test(custom.from) || !DAY.test(custom.to)) return { error: "For a custom period give from and to as YYYY-MM-DD." };
      from = custom.from;
      to = custom.to;
      if (from > to) return { error: "from must be on or before to." };
      if (addDays(from, MAX_CUSTOM_DAYS) < to) return { error: `A custom period can be at most ${MAX_CUSTOM_DAYS} days.` };
      break;
    }
  }
  const days = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
  return { period, from, to, days };
}

/** The India day (YYYY-MM-DD) and hour of an ISO instant. */
export function indiaDayHour(iso: string) {
  const t = new Date(Date.parse(iso) + IST_MS);
  return { day: t.toISOString().slice(0, 10), hour: t.getUTCHours() };
}
const startIso = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) - IST_MS).toISOString();

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const weekdayOf = (day: string) => WEEKDAYS[new Date(`${day}T00:00:00Z`).getUTCDay()];
const dayLabel = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const hourLabel = (h: number) => (h === 0 ? "12 am" : h < 12 ? `${h} am` : h === 12 ? "12 pm" : `${h - 12} pm`);

/** Rupees the Indian way, with ₹, so the reply check knows each amount: ₹1,23,450. */
export const rupee = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const share = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

// --- Reading the rows, scoped to one organization. ---

/** Runs one fixed read as the bot. Postgres by default; tests pass PGlite. */
export type BotRead = (org: OrgId, text: string, params: unknown[]) => Promise<Record<string, unknown>[]>;

const ENQUIRY_SQL = `SELECT id, created_at, cafe_slug, venue, event_type, date::text AS date, slot, guests, name, status, source, channel, is_demo FROM cafe_event_enquiries ORDER BY created_at DESC LIMIT 5000`;
const ORDER_SQL = `SELECT ${ORDER_COLUMNS} FROM cafe_orders WHERE created_at >= $1 AND created_at < $2 ORDER BY created_at LIMIT 20000`;

type EnquiryRow = Pick<Enquiry, "id" | "createdAt" | "venue" | "eventType" | "date" | "slot" | "guests" | "name" | "status" | "source" | "channel" | "isDemo">;

function defaultReader(): BotRead | undefined {
  return botUsesDatabase() ? (org, text, params) => botQuery(org, text, params) : undefined;
}

export async function readEnquiries(org: OrgId, read: BotRead | undefined = defaultReader()): Promise<EnquiryRow[]> {
  if (!read) {
    getEnquiryStore(); // fills the memory store with the demo seed on first use
    return scopeMemoryRows(org, "cafe_event_enquiries", allMemoryEnquiries());
  }
  const rows = await read(org, ENQUIRY_SQL, []);
  return rows.map((r) => ({
    id: String(r.id),
    createdAt: new Date(r.created_at as string).toISOString(),
    venue: r.venue as Enquiry["venue"],
    eventType: r.event_type as Enquiry["eventType"],
    date: String(r.date),
    slot: String(r.slot),
    guests: Number(r.guests),
    name: String(r.name),
    status: r.status as Enquiry["status"],
    source: r.source as Enquiry["source"],
    channel: r.channel as Enquiry["channel"],
    isDemo: Boolean(r.is_demo),
  }));
}

/** Orders created on the India days from..to (inclusive). */
export async function readOrders(org: OrgId, range: { from: string; to: string }, read: BotRead | undefined = defaultReader()): Promise<Order[]> {
  const fromIso = startIso(range.from);
  const toIso = startIso(addDays(range.to, 1));
  if (!read) {
    getOrderStore(); // fills the memory store with the demo seed on first use
    return scopeMemoryRows(org, "cafe_orders", allMemoryOrders()).filter((o) => o.createdAt >= fromIso && o.createdAt < toIso);
  }
  return (await read(org, ORDER_SQL, [fromIso, toIso])).map((r) => toOrder(r as unknown as OrderRow));
}

// --- Enquiries. ---

export const ENQUIRY_GROUPS = ["status", "source", "venue", "event_type", "event_date", "weekday", "channel"] as const;
const VENUE_IDS = ["courtyard", "conservatory"] as const;
const EVENT_TYPE_IDS = EVENT_TYPES.map((t) => t.id) as ["birthday", "small_function", "corporate", "other"];

const periodFields = {
  period: z.enum(PERIODS).describe("The time window. Weeks run Monday to Sunday. this_month is the whole calendar month. Use custom with from and to for any other dates."),
  from: z.string().max(10).optional().describe("Only with period custom: first day, YYYY-MM-DD."),
  to: z.string().max(10).optional().describe("Only with period custom: last day, YYYY-MM-DD."),
};

export const enquiryStatsInput = z.strictObject({
  ...periodFields,
  dateBasis: z
    .enum(["received", "event_date"])
    .default("received")
    .describe("received = when the enquiry came in (for 'how many enquiries this month'); event_date = the day of the event itself (for 'events next week')."),
  groupBy: z.enum(ENQUIRY_GROUPS).optional().describe("Split the count: status, source (where the lead came from), venue, event_type, event_date, weekday, or channel (venue page form or Ogi chat)."),
  status: z.enum(ENQUIRY_STATUSES).optional().describe("Only enquiries with this status: new, contacted, confirmed or declined."),
  source: z.enum(PUBLIC_SOURCES).optional().describe("Only leads from this source."),
  venue: z.enum(VENUE_IDS).optional().describe("Only this venue."),
});

export const listEnquiriesInput = z.strictObject({
  ...periodFields,
  dateBasis: z.enum(["received", "event_date"]).default("received").describe("received = when it came in; event_date = the event day."),
  status: z.enum(ENQUIRY_STATUSES).optional(),
  source: z.enum(PUBLIC_SOURCES).optional(),
  venue: z.enum(VENUE_IDS).optional(),
  eventType: z.enum(EVENT_TYPE_IDS).optional(),
  limit: z.number().int().min(1).max(10).default(5).describe("How many to list, at most 10."),
});

type EnquiryFilter = z.infer<typeof listEnquiriesInput> | z.infer<typeof enquiryStatsInput>;

function filterEnquiries(rows: EnquiryRow[], range: Range, f: EnquiryFilter) {
  const dayOf = (e: EnquiryRow) => (f.dateBasis === "event_date" ? e.date : indiaDayHour(e.createdAt).day);
  return rows.filter((e) => {
    const d = dayOf(e);
    if (d < range.from || d > range.to) return false;
    if (f.status && e.status !== f.status) return false;
    if (f.source && e.source !== f.source) return false;
    if (f.venue && e.venue !== f.venue) return false;
    if ("eventType" in f && f.eventType && e.eventType !== f.eventType) return false;
    return true;
  });
}

const CHANNEL_LABELS = { form: "Venue page form", ogi: "Ogi chat" } as const;

export function enquiryStats(rows: EnquiryRow[], range: Range, input: z.infer<typeof enquiryStatsInput>) {
  const picked = filterEnquiries(rows, range, input);
  const dayOf = (e: EnquiryRow) => (input.dateBasis === "event_date" ? e.date : indiaDayHour(e.createdAt).day);
  const out: Record<string, unknown> = {
    period: range.period,
    from: range.from,
    to: range.to,
    days: range.days,
    countedBy: input.dateBasis === "event_date" ? "event day" : "day received",
    filters: { status: input.status ?? "any", source: input.source ? SOURCE_LABELS[input.source] : "any", venue: input.venue ? venueById(input.venue)!.name : "any" },
    total: picked.length,
    guests: picked.reduce((n, e) => n + e.guests, 0),
  };
  if (input.groupBy) {
    const groups = new Map<string, { label: string; count: number }>();
    for (const e of picked) {
      const [key, label] = ((): [string, string] => {
        switch (input.groupBy!) {
          case "status": return [e.status, e.status];
          case "source": return [e.source, SOURCE_LABELS[e.source]];
          case "venue": return [e.venue, venueById(e.venue)?.name ?? e.venue];
          case "event_type": return [e.eventType, eventTypeLabel(e.eventType)];
          case "event_date": return [e.date, dayLabel(e.date)];
          case "weekday": { const w = weekdayOf(dayOf(e)); return [w, w]; }
          case "channel": return [e.channel, CHANNEL_LABELS[e.channel]];
        }
      })();
      const g = groups.get(key) ?? { label, count: 0 };
      g.count += 1;
      groups.set(key, g);
    }
    out.groupBy = input.groupBy;
    out.groups = [...groups.values()]
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 15)
      .map((g) => ({ ...g, sharePercent: share(g.count, picked.length) }));
  }
  return out;
}

export function listEnquiries(rows: EnquiryRow[], range: Range, input: z.infer<typeof listEnquiriesInput>) {
  const picked = filterEnquiries(rows, range, input).sort((a, b) =>
    input.dateBasis === "event_date" ? a.date.localeCompare(b.date) : b.createdAt.localeCompare(a.createdAt),
  );
  return {
    period: range.period,
    from: range.from,
    to: range.to,
    matching: picked.length,
    shown: Math.min(picked.length, input.limit),
    enquiries: picked.slice(0, input.limit).map((e) => ({
      name: e.name,
      received: indiaDayHour(e.createdAt).day,
      eventDay: e.date,
      venue: venueById(e.venue)?.name ?? e.venue,
      event: eventTypeLabel(e.eventType),
      guests: e.guests,
      status: e.status,
      source: SOURCE_LABELS[e.source],
      via: CHANNEL_LABELS[e.channel],
    })),
  };
}

// --- Orders. ---

export const ORDER_GROUPS = ["item", "category", "day", "weekday", "hour", "channel"] as const;

export const orderStatsInput = z.strictObject({
  ...periodFields,
  groupBy: z.enum(ORDER_GROUPS).optional().describe("Split orders and sales: item, category, day (each date), weekday, hour of day, or channel (website, WhatsApp, walk-in)."),
  channel: z.enum(ORDER_CHANNELS).optional().describe("Only orders from this channel."),
});

export const topItemsInput = z.strictObject({
  ...periodFields,
  rank: z.enum(["best", "slowest"]).default("best").describe("best = best sellers first; slowest = slowest sellers first."),
  by: z.enum(["quantity", "sales"]).default("quantity").describe("Rank by units sold or by rupee sales."),
  limit: z.number().int().min(1).max(10).default(5).describe("How many items, at most 10."),
});

type Bucket = { label: string; orders: number; itemsSold: number; sales: number; days?: Set<string> };

export function orderStats(orders: Order[], range: Range, input: { groupBy?: (typeof ORDER_GROUPS)[number]; channel?: (typeof ORDER_CHANNELS)[number] }) {
  const picked = input.channel ? orders.filter((o) => o.channel === input.channel) : orders;
  const sales = picked.reduce((n, o) => n + o.total, 0);
  const items = picked.reduce((n, o) => n + o.itemCount, 0);
  const out: Record<string, unknown> = {
    period: range.period,
    from: range.from,
    to: range.to,
    days: range.days,
    channel: input.channel ? ORDER_CHANNEL_LABELS[input.channel] : "all",
    orders: picked.length,
    itemsSold: items,
    sales: rupee(sales),
    averageOrder: rupee(picked.length ? sales / picked.length : 0),
    note: "Sales are order totals incl. GST. There is no cost, profit, staff or stock data.",
  };
  if (!input.groupBy) return out;
  const buckets = new Map<string, Bucket>();
  const add = (key: string, label: string, b: { orders: number; itemsSold: number; sales: number }, day?: string) => {
    const g = buckets.get(key) ?? { label, orders: 0, itemsSold: 0, sales: 0, days: new Set<string>() };
    g.orders += b.orders;
    g.itemsSold += b.itemsSold;
    g.sales += b.sales;
    if (day) g.days!.add(day);
    buckets.set(key, g);
  };
  for (const o of picked) {
    const { day, hour } = indiaDayHour(o.createdAt);
    const whole = { orders: 1, itemsSold: o.itemCount, sales: o.total };
    switch (input.groupBy) {
      case "item":
        for (const i of o.items) add(i.id, i.name, { orders: 1, itemsSold: i.qty, sales: i.qty * i.unitPrice });
        break;
      case "category": {
        const seen = new Set<string>();
        for (const i of o.items) {
          add(i.category, i.category, { orders: seen.has(i.category) ? 0 : 1, itemsSold: i.qty, sales: i.qty * i.unitPrice });
          seen.add(i.category);
        }
        break;
      }
      case "day": add(day, dayLabel(day), whole); break;
      case "weekday": add(weekdayOf(day), weekdayOf(day), whole, day); break;
      case "hour": add(String(hour).padStart(2, "0"), hourLabel(hour), whole); break;
      case "channel": add(o.channel, ORDER_CHANNEL_LABELS[o.channel], whole); break;
    }
  }
  const sortKey = input.groupBy === "item" || input.groupBy === "category" ? (b: Bucket) => b.itemsSold : (b: Bucket) => b.orders;
  out.groupBy = input.groupBy;
  out.groups = [...buckets.values()]
    .sort((a, b) => sortKey(b) - sortKey(a) || a.label.localeCompare(b.label))
    .slice(0, input.groupBy === "day" ? 31 : 24)
    .map((b) => ({
      label: b.label,
      orders: b.orders,
      itemsSold: b.itemsSold,
      sales: rupee(b.sales),
      ...(input.groupBy === "weekday" ? { daysCounted: b.days!.size, averageOrdersPerDay: Math.round(b.orders / Math.max(1, b.days!.size)) } : {}),
      ...(input.groupBy === "item" || input.groupBy === "category" ? { shareOfItemsPercent: share(b.itemsSold, items) } : { shareOfOrdersPercent: share(b.orders, picked.length) }),
    }));
  return out;
}

export function topItems(orders: Order[], range: Range, input: { rank: "best" | "slowest"; by: "quantity" | "sales"; limit: number }, menu: readonly { id: string; name: string }[] = []) {
  const totals = new Map<string, { name: string; itemsSold: number; sales: number; orders: number }>();
  // Every menu item counts, so an item nobody ordered shows as a slow seller with 0.
  for (const m of menu) totals.set(m.id, { name: m.name, itemsSold: 0, sales: 0, orders: 0 });
  for (const o of orders) {
    for (const i of o.items) {
      const t = totals.get(i.id) ?? { name: i.name, itemsSold: 0, sales: 0, orders: 0 };
      t.itemsSold += i.qty;
      t.sales += i.qty * i.unitPrice;
      t.orders += 1;
      totals.set(i.id, t);
    }
  }
  const key = input.by === "sales" ? (t: { sales: number }) => t.sales : (t: { itemsSold: number }) => t.itemsSold;
  const sorted = [...totals.values()].sort((a, b) => (input.rank === "best" ? key(b) - key(a) : key(a) - key(b)) || a.name.localeCompare(b.name));
  const allItems = orders.reduce((n, o) => n + o.itemCount, 0);
  return {
    period: range.period,
    from: range.from,
    to: range.to,
    days: range.days,
    rank: input.rank,
    rankedBy: input.by,
    ordersInPeriod: orders.length,
    items: sorted.slice(0, input.limit).map((t, i) => ({
      position: i + 1,
      name: t.name,
      itemsSold: t.itemsSold,
      sales: rupee(t.sales),
      ordersWithIt: t.orders,
      shareOfItemsPercent: share(t.itemsSold, allItems),
    })),
  };
}
