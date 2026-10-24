/**
 * CRM business rules, on top of any CrmStore: pricing a quote, the Today numbers, recent activity,
 * marking a quote sold, follow-ups, and the daily reminder run. The API routes call these.
 */
import type { WhatsAppSender } from "@/lib/whatsapp";
import { lineBoxes, quoteTotals, rupeesToPaise } from "./math";
import { sendCrmMessage } from "./notify";
import type { Shop } from "./shop";
import { addDays, endOfShopToday, startOfShopMonth, startOfShopWeek } from "./time";
import type { CrmMessage, CrmStore, Followup, Lead, Product, Quote, QuoteContent, QuoteStatus } from "./types";

/** A quote line as the builder sends it: boxes, or a room area with wastage. */
export type LineRequest = { productId: string; qtyBoxes?: number; areaSqft?: number | null; wastagePct?: number };

export class QuoteInputError extends Error {}

/**
 * Prices lines from the catalogue: unit price is the product's price now, boxes come from the area when one is given.
 * Throws QuoteInputError for an unknown or inactive product, a zero-box line, or a discount above the subtotal.
 */
export function priceQuote(products: Product[], lines: LineRequest[], discountRupees: number, notes: string, keepInactive: ReadonlySet<string> = new Set()): QuoteContent {
  const byId = new Map(products.map((p) => [p.id, p]));
  const items = lines.map((line) => {
    const p = byId.get(line.productId);
    if (!p) throw new QuoteInputError("One of the products is not in the catalogue.");
    // A product switched off later can stay on a quote that already had it.
    if (!p.active && !keepInactive.has(p.id)) throw new QuoteInputError(`${p.name} is not active in the catalogue.`);
    const areaSqft = line.areaSqft != null && line.areaSqft > 0 ? Math.round(line.areaSqft * 100) / 100 : null;
    const wastagePct = line.wastagePct ?? 10;
    const qtyBoxes = lineBoxes({ qtyBoxes: line.qtyBoxes, areaSqft, wastagePct }, p.sqftPerBox);
    if (qtyBoxes < 1) throw new QuoteInputError(`Enter boxes or an area for ${p.name}.`);
    return { productId: p.id, qtyBoxes, areaSqft, wastagePct, unitPrice: p.pricePerBox, lineTotal: qtyBoxes * p.pricePerBox };
  });
  const discount = rupeesToPaise(discountRupees);
  const totals = quoteTotals(
    items.map((i) => i.lineTotal),
    discount,
  );
  if (discount > totals.subtotal) throw new QuoteInputError("The discount is more than the quote.");
  return { items, ...totals, notes };
}

/** Quotes that can still change: a sold or lost quote is closed. */
export const isOpenQuote = (q: Pick<Quote, "status">) => q.status === "draft" || q.status === "sent";

export type TodayCounts = { newLeadsThisWeek: number; openQuotes: number; soldThisMonth: number; soldValueThisMonth: number; dueToday: number };

export function todayCounts(leads: Lead[], quotes: Quote[], openFollowups: Followup[], now: Date = new Date()): TodayCounts {
  const week = startOfShopWeek(now).toISOString();
  const month = startOfShopMonth(now).toISOString();
  const soldThisMonth = quotes.filter((q) => q.status === "sold" && q.soldAt && q.soldAt >= month);
  return {
    newLeadsThisWeek: leads.filter((l) => l.createdAt >= week).length,
    openQuotes: quotes.filter(isOpenQuote).length,
    soldThisMonth: soldThisMonth.length,
    soldValueThisMonth: soldThisMonth.reduce((sum, q) => sum + q.total, 0),
    dueToday: dueToday(openFollowups, leads, now).length,
  };
}

/** Open call follow-ups due before tomorrow (India), oldest first, for leads that are still leads. */
export function dueToday(openFollowups: Followup[], leads: Lead[], now: Date = new Date()) {
  const endToday = endOfShopToday(now).toISOString();
  const active = new Map(leads.filter((l) => l.status === "lead").map((l) => [l.id, l]));
  return openFollowups
    .filter((f) => !f.doneAt && f.kind === "call" && f.dueAt < endToday && active.has(f.leadId))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .map((f) => ({ ...f, lead: active.get(f.leadId)! }));
}

export type Activity = { at: string; kind: "lead" | "quote_sent" | "quote_sold" | "quote_lost" | "call_done" | "whatsapp"; leadId: string; leadName: string; text: string };

/** The newest things that happened, built from the rows themselves. */
export function recentActivity(leads: Lead[], quotes: Quote[], followups: Followup[], messages: CrmMessage[], limit = 12): Activity[] {
  const names = new Map(leads.map((l) => [l.id, l.name]));
  const out: Activity[] = [];
  const add = (at: string | null, kind: Activity["kind"], leadId: string, text: string) => {
    if (at && names.has(leadId)) out.push({ at, kind, leadId, leadName: names.get(leadId)!, text });
  };
  for (const l of leads) add(l.createdAt, "lead", l.id, `New lead from ${l.source}`);
  for (const q of quotes) {
    add(q.sentAt, "quote_sent", q.leadId, `Quote ${q.number} sent`);
    if (q.status === "sold") add(q.soldAt, "quote_sold", q.leadId, `Quote ${q.number} sold`);
  }
  for (const f of followups) if (f.kind === "call" && f.doneAt) add(f.doneAt, "call_done", f.leadId, f.result ? `Call: ${f.result}` : "Call done");
  for (const m of messages)
    if (m.kind === "crm_reminder") add(m.createdAt, "whatsapp", m.leadId, m.status === "failed" ? "WhatsApp reminder failed" : "WhatsApp reminder sent");
  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

/**
 * Quote sold: the quote is closed as sold, the lead becomes a customer (converted the first time only),
 * and their open call follow-ups are closed. Other open quotes stay as they are.
 */
export async function markQuoteSold(store: CrmStore, shop: string, quote: Quote, at: string) {
  const sold = await store.setQuoteStatus(shop, quote.id, "sold", at);
  const lead = await store.markCustomer(shop, quote.leadId, at);
  await store.touchLead(shop, quote.leadId, at);
  for (const f of await store.listFollowups(shop, { leadId: quote.leadId, open: true })) {
    await store.updateFollowup(shop, f.id, { doneAt: at, result: "Closed: quote sold" });
  }
  await store.refreshNextFollowUp(shop, quote.leadId);
  return { quote: sold, lead };
}

export async function setQuoteClosed(store: CrmStore, shop: string, quote: Quote, status: Extract<QuoteStatus, "sold" | "lost">, at: string) {
  if (status === "sold") return markQuoteSold(store, shop, quote, at);
  const lost = await store.setQuoteStatus(shop, quote.id, "lost", at);
  return { quote: lost, lead: await store.getLead(shop, quote.leadId) };
}

/** Done: closes the follow-up and counts as contact with the lead. */
export async function completeFollowup(store: CrmStore, shop: string, f: Followup, result: string | undefined, at: string) {
  const done = await store.updateFollowup(shop, f.id, { doneAt: at, result: result?.trim() || "Called" });
  await store.touchLead(shop, f.leadId, at);
  await store.refreshNextFollowUp(shop, f.leadId);
  return done;
}

/** Snooze: the same follow-up comes back `days` days from now. */
export async function snoozeFollowup(store: CrmStore, shop: string, f: Followup, days: number, now: Date = new Date()) {
  const moved = await store.updateFollowup(shop, f.id, { dueAt: addDays(now, days).toISOString() });
  await store.refreshNextFollowUp(shop, f.leadId);
  return moved;
}

/** How long a lead with a sent quote waits before the automatic WhatsApp nudge. */
export const REMINDER_AFTER_DAYS = 2;

/**
 * Leads due an automatic reminder: still a lead, newest quote is "sent", no contact for 2 days,
 * and no automatic WhatsApp in the last 2 days.
 */
export function leadsDueReminder(leads: Lead[], quotes: Quote[], followups: Followup[], now: Date = new Date()) {
  const cutoff = addDays(now, -REMINDER_AFTER_DAYS).toISOString();
  const latest = new Map<string, Quote>();
  for (const q of quotes) {
    const seen = latest.get(q.leadId);
    if (!seen || q.createdAt > seen.createdAt || (q.createdAt === seen.createdAt && q.seq > seen.seq)) latest.set(q.leadId, q);
  }
  const nudged = new Set(followups.filter((f) => f.kind === "auto_whatsapp" && f.dueAt > cutoff).map((f) => f.leadId));
  return leads
    .filter((l) => l.status === "lead" && l.lastContactAt < cutoff && !nudged.has(l.id) && latest.get(l.id)?.status === "sent")
    .map((lead) => ({ lead, quote: latest.get(lead.id)! }));
}

/**
 * The daily run for one shop: a WhatsApp reminder to each lead due one, logged as an auto_whatsapp follow-up,
 * and a call follow-up due today unless one is already open.
 */
export async function runFollowups(store: CrmStore, shop: Shop, opts: { origin: string; now?: Date; sender?: WhatsAppSender; env?: Record<string, string | undefined> }) {
  const now = opts.now ?? new Date();
  const at = now.toISOString();
  const [leads, quotes, followups] = await Promise.all([store.listLeads(shop.slug), store.listQuotes(shop.slug), store.listFollowups(shop.slug)]);
  const due = leadsDueReminder(leads, quotes, followups, now);
  let sent = 0;
  let failed = 0;
  let calls = 0;
  for (const { lead, quote } of due) {
    const msg = await sendCrmMessage("crm_reminder", { store, shop, lead, quote, origin: opts.origin, env: opts.env, sender: opts.sender });
    const ok = msg?.status === "sent";
    if (ok) sent += 1;
    else failed += 1;
    await store.createFollowup(shop.slug, { leadId: lead.id, quoteId: quote.id, kind: "auto_whatsapp", dueAt: at, doneAt: at, result: ok ? "sent" : "failed" });
    const openCall = followups.some((f) => f.leadId === lead.id && f.kind === "call" && !f.doneAt);
    if (!openCall) {
      await store.createFollowup(shop.slug, { leadId: lead.id, quoteId: quote.id, kind: "call", dueAt: at });
      calls += 1;
    }
    await store.refreshNextFollowUp(shop.slug, lead.id);
  }
  return { shop: shop.slug, due: due.length, sent, failed, calls };
}
