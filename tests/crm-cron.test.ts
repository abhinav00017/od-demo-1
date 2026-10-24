// @vitest-environment node
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/cron/crm-followups/route";
import { memoryCrmStore as store, resetMemoryCrmStore } from "@/lib/crm/memory";
import { leadsDueReminder } from "@/lib/crm/service";
import type { Followup, Lead, Quote } from "@/lib/crm/types";

// Saturday 24 Oct 2026, 9:30 in India: when Vercel Cron runs the job.
const NOW = new Date("2026-10-24T04:00:00Z");
const SHOP = "kalyani-tiles";
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

function lead(id: string, over: Partial<Lead> = {}): Lead {
  return { id, shopSlug: SHOP, name: id, phone: "9876500001", status: "lead", source: "walk-in", notes: "", nextFollowUpAt: null, lastContactAt: daysAgo(3), createdAt: daysAgo(5), convertedAt: null, ...over };
}
function quote(id: string, leadId: string, over: Partial<Quote> = {}): Quote {
  return { id, shopSlug: SHOP, leadId, seq: 1, number: `KT-${id}`, publicKey: "k", status: "sent", subtotal: 1, discount: 0, total: 1, sentAt: daysAgo(3), soldAt: null, notes: "", createdAt: daysAgo(4), ...over };
}
function followup(leadId: string, over: Partial<Followup> = {}): Followup {
  return { id: `f-${leadId}`, shopSlug: SHOP, leadId, quoteId: null, kind: "auto_whatsapp", dueAt: daysAgo(1), doneAt: daysAgo(1), result: "sent", createdAt: daysAgo(1), ...over };
}

describe("who gets the 2-day reminder", () => {
  it("picks leads whose newest quote is sent, quiet for 2 days, with no nudge in 2 days", () => {
    const leads = [
      lead("due"),
      lead("recent-contact", { lastContactAt: daysAgo(1) }),
      lead("customer", { status: "customer" }),
      lead("lost", { status: "lost" }),
      lead("draft-only"),
      lead("newest-is-draft"),
      lead("nudged-yesterday"),
      lead("nudged-3-days-ago"),
      lead("no-quote"),
    ];
    const quotes = [
      quote("1", "due"),
      quote("2", "recent-contact"),
      quote("3", "customer", { status: "sold" }),
      quote("4", "lost", { status: "lost" }),
      quote("5", "draft-only", { status: "draft", sentAt: null }),
      quote("6", "newest-is-draft"),
      quote("7", "newest-is-draft", { status: "draft", sentAt: null, createdAt: daysAgo(1), seq: 2 }),
      quote("8", "nudged-yesterday"),
      quote("9", "nudged-3-days-ago"),
    ];
    const followups = [followup("nudged-yesterday"), followup("nudged-3-days-ago", { dueAt: daysAgo(3) }), followup("due", { kind: "call", doneAt: null, dueAt: daysAgo(1) })];
    expect(leadsDueReminder(leads, quotes, followups, NOW).map((d) => [d.lead.id, d.quote.id])).toEqual([
      ["due", "1"],
      ["nudged-3-days-ago", "9"],
    ]);
  });

  it("counts exactly 2 days as not yet quiet enough", () => {
    expect(leadsDueReminder([lead("a", { lastContactAt: daysAgo(2) })], [quote("1", "a")], [], NOW)).toEqual([]);
  });
});

const logs: string[] = [];
const call = (auth?: string) => GET(new NextRequest("http://localhost/api/cron/crm-followups", { headers: auth ? { authorization: auth } : {} }));

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});
afterAll(() => vi.useRealTimers());
beforeEach(() => {
  logs.length = 0;
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("CRON_SECRET", "cron-test");
  vi.stubEnv("WHATSAPP_FAKE", "1");
  for (const level of ["log", "error", "warn", "info"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => void logs.push(args.map(String).join(" ")));
  }
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GET /api/cron/crm-followups", () => {
  it("refuses without CRON_SECRET, and with a wrong bearer", async () => {
    resetMemoryCrmStore();
    vi.stubEnv("CRON_SECRET", "");
    expect((await call("Bearer cron-test")).status).toBe(503);
    vi.stubEnv("CRON_SECRET", "cron-test");
    expect((await call()).status).toBe(401);
    expect((await call("Bearer nope")).status).toBe(401);
  });

  it("reminds the right seeded lead once, adds one call follow-up, and sends nothing on a second run", async () => {
    resetMemoryCrmStore({ seed: true });
    const res = await call("Bearer cron-test");
    expect(res.status).toBe(200);
    // Ravi: quote sent 4 days ago, no contact since, no nudge yet. Fathima was nudged yesterday. The rest have no sent quote.
    expect(await res.json()).toEqual({ ok: true, shops: [{ shop: SHOP, due: 1, sent: 1, failed: 0, calls: 0 }] });
    const ravi = (await store.listLeads(SHOP)).find((l) => l.name === "Ravi Teja Varma")!;
    const messages = await store.listMessages(SHOP, { leadId: ravi.id });
    expect(messages).toMatchObject([{ kind: "crm_reminder", provider: "fake", status: "sent", toMasked: "••••0101" }]);
    const followups = await store.listFollowups(SHOP, { leadId: ravi.id });
    expect(followups.filter((f) => f.kind === "auto_whatsapp")).toMatchObject([{ doneAt: NOW.toISOString(), result: "sent" }]);
    // Ravi already had a call due today, so no second call was added.
    expect(followups.filter((f) => f.kind === "call" && !f.doneAt)).toHaveLength(1);
    expect(logs).toContain("whatsapp (fake): template crm_reminder to ••••0101");
    expect(logs).toContain(`crm followups: ${SHOP}, 1 due, 1 sent, 0 failed, 0 calls added`);

    expect(await (await call("Bearer cron-test")).json()).toEqual({ ok: true, shops: [{ shop: SHOP, due: 0, sent: 0, failed: 0, calls: 0 }] });
  });

  it("adds a call due today when the lead has none open", async () => {
    resetMemoryCrmStore();
    const p = await store.createProduct(SHOP, { sku: "A", name: "A", brand: "B", category: "floor", sizeMm: "600x600", finish: "M", pricePerBox: 100, sqftPerBox: 15.5, piecesPerBox: 4, imageUrl: null, active: true });
    const l = await store.createLead(SHOP, { name: "Quiet Lead", phone: "9876500009", source: "call", notes: "" }, daysAgo(6));
    const q = await store.createQuote(SHOP, l.id, { items: [{ productId: p.id, qtyBoxes: 1, areaSqft: null, wastagePct: 10, unitPrice: 100, lineTotal: 100 }], subtotal: 100, discount: 0, total: 100, notes: "" }, { prefix: "KT", publicKey: "k", at: daysAgo(5) });
    await store.setQuoteStatus(SHOP, q.id, "sent", daysAgo(5));
    expect((await (await call("Bearer cron-test")).json()).shops[0]).toMatchObject({ due: 1, sent: 1, calls: 1 });
    const open = await store.listFollowups(SHOP, { leadId: l.id, open: true });
    expect(open).toMatchObject([{ kind: "call", dueAt: NOW.toISOString(), quoteId: q.id }]);
    expect((await store.getLead(SHOP, l.id))?.nextFollowUpAt).toBe(NOW.toISOString());
    // No log line carries the number.
    expect(logs.join("\n")).not.toContain("9876500009");
  });
});
