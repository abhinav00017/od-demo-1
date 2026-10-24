// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCrmStore } from "@/lib/crm";
import { memoryCrmStore as store, resetMemoryCrmStore } from "@/lib/crm/memory";
import { SEED_PHONES, seedCrm, seedProducts } from "@/lib/crm/seed";
import { markQuoteSold, priceQuote, QuoteInputError, todayCounts } from "@/lib/crm/service";
import { KALYANI } from "@/lib/crm/shop";
import { DuplicateError, type NewProduct } from "@/lib/crm/types";

const SHOP = "kalyani-tiles";
const OTHER = "other-shop";

const tile: NewProduct = {
  sku: "KT-T1",
  name: "Test Marble",
  brand: "Vitrano",
  category: "floor",
  sizeMm: "600x600",
  finish: "Glossy",
  pricePerBox: 1000_00,
  sqftPerBox: 15.5,
  piecesPerBox: 4,
  imageUrl: null,
  active: true,
};

beforeEach(() => {
  resetMemoryCrmStore();
  vi.stubEnv("DATABASE_URL", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("products", () => {
  it("creates, lists per shop and refuses a duplicate SKU in the same shop", async () => {
    const p = await store.createProduct(SHOP, tile);
    expect(p).toMatchObject({ shopSlug: SHOP, sku: "KT-T1", pricePerBox: 100000, active: true });
    await expect(store.createProduct(SHOP, { ...tile, sku: "kt-t1" })).rejects.toBeInstanceOf(DuplicateError);
    // Another shop may use the same SKU.
    await store.createProduct(OTHER, tile);
    expect(await store.listProducts(SHOP)).toHaveLength(1);
  });

  it("updates fields and the active switch, only in its own shop", async () => {
    const p = await store.createProduct(SHOP, tile);
    expect(await store.updateProduct(SHOP, p.id, { active: false, pricePerBox: 1200_00 })).toMatchObject({ active: false, pricePerBox: 120000, name: "Test Marble" });
    expect(await store.updateProduct(OTHER, p.id, { name: "x" })).toBeNull();
  });
});

describe("leads", () => {
  it("creates a lead with last contact at creation, and refuses the same number twice in a shop", async () => {
    const lead = await store.createLead(SHOP, { name: "Asha Rao", phone: "9876500001", source: "walk-in", notes: "" }, "2026-10-20T05:00:00.000Z");
    expect(lead).toMatchObject({ status: "lead", lastContactAt: "2026-10-20T05:00:00.000Z", convertedAt: null, nextFollowUpAt: null });
    const dup = await store.createLead(SHOP, { name: "Someone", phone: "9876500001", source: "call", notes: "" }).catch((e: unknown) => e);
    expect(dup).toBeInstanceOf(DuplicateError);
    expect((dup as DuplicateError).existingId).toBe(lead.id);
    await expect(store.createLead(OTHER, { name: "Asha Rao", phone: "9876500001", source: "walk-in", notes: "" })).resolves.toBeTruthy();
  });

  it("marks a customer once, keeps the first conversion time, and only moves last contact forward", async () => {
    const lead = await store.createLead(SHOP, { name: "Asha Rao", phone: "9876500001", source: "walk-in", notes: "" }, "2026-10-20T05:00:00.000Z");
    expect(await store.markCustomer(SHOP, lead.id, "2026-10-21T05:00:00.000Z")).toMatchObject({ status: "customer", convertedAt: "2026-10-21T05:00:00.000Z" });
    expect((await store.markCustomer(SHOP, lead.id, "2026-10-25T05:00:00.000Z"))?.convertedAt).toBe("2026-10-21T05:00:00.000Z");
    await store.touchLead(SHOP, lead.id, "2026-10-22T05:00:00.000Z");
    await store.touchLead(SHOP, lead.id, "2026-10-21T00:00:00.000Z");
    expect((await store.getLead(SHOP, lead.id))?.lastContactAt).toBe("2026-10-22T05:00:00.000Z");
  });

  it("keeps next follow-up at the earliest open one", async () => {
    const lead = await store.createLead(SHOP, { name: "Asha Rao", phone: "9876500001", source: "walk-in", notes: "" });
    const a = await store.createFollowup(SHOP, { leadId: lead.id, kind: "call", dueAt: "2026-10-26T05:00:00.000Z" });
    await store.createFollowup(SHOP, { leadId: lead.id, kind: "call", dueAt: "2026-10-28T05:00:00.000Z" });
    await store.refreshNextFollowUp(SHOP, lead.id);
    expect((await store.getLead(SHOP, lead.id))?.nextFollowUpAt).toBe("2026-10-26T05:00:00.000Z");
    await store.updateFollowup(SHOP, a.id, { doneAt: "2026-10-26T06:00:00.000Z", result: "Called" });
    await store.refreshNextFollowUp(SHOP, lead.id);
    expect((await store.getLead(SHOP, lead.id))?.nextFollowUpAt).toBe("2026-10-28T05:00:00.000Z");
    expect(await store.listFollowups(SHOP, { leadId: lead.id, open: true })).toHaveLength(1);
    expect(await store.listFollowups(SHOP, { leadId: lead.id, open: false })).toHaveLength(1);
  });
});

describe("quotes", () => {
  async function setup() {
    const p = await store.createProduct(SHOP, tile);
    const lead = await store.createLead(SHOP, { name: "Asha Rao", phone: "9876500001", source: "walk-in", notes: "" });
    return { p, lead };
  }

  it("prices lines from the catalogue: area to boxes with wastage, line totals, discount", async () => {
    const { p } = await setup();
    const content = priceQuote([p], [{ productId: p.id, areaSqft: 120, wastagePct: 10 }, { productId: p.id, qtyBoxes: 2 }], 500, "Note");
    expect(content.items.map((i) => [i.qtyBoxes, i.areaSqft, i.lineTotal])).toEqual([
      [9, 120, 9000_00],
      [2, null, 2000_00],
    ]);
    expect(content).toMatchObject({ subtotal: 11000_00, discount: 500_00, total: 10500_00, notes: "Note" });
    expect(() => priceQuote([p], [{ productId: p.id, qtyBoxes: 1 }], 5000, "")).toThrow(QuoteInputError);
    expect(() => priceQuote([{ ...p, active: false }], [{ productId: p.id, qtyBoxes: 1 }], 0, "")).toThrow(/not active/);
    // An inactive product already on the quote can stay.
    expect(priceQuote([{ ...p, active: false }], [{ productId: p.id, qtyBoxes: 1 }], 0, "", new Set([p.id])).total).toBe(1000_00);
  });

  it("numbers quotes per shop, saves items in order and replaces them on save", async () => {
    const { p, lead } = await setup();
    const content = priceQuote([p], [{ productId: p.id, qtyBoxes: 3 }], 0, "");
    const q1 = await store.createQuote(SHOP, lead.id, content, { prefix: "KT", publicKey: "k1" });
    const q2 = await store.createQuote(SHOP, lead.id, content, { prefix: "KT", publicKey: "k2" });
    expect([q1.number, q2.number]).toEqual(["KT-0001", "KT-0002"]);
    expect(q1).toMatchObject({ status: "draft", total: 3000_00, items: [{ qtyBoxes: 3, position: 0, product: { name: "Test Marble", sqftPerBox: 15.5 } }] });
    const saved = await store.saveQuote(SHOP, q1.id, priceQuote([p], [{ productId: p.id, qtyBoxes: 1 }, { productId: p.id, areaSqft: 31, wastagePct: 0 }], 0, "x"));
    expect(saved?.items.map((i) => i.qtyBoxes)).toEqual([1, 2]);
    expect(saved?.total).toBe(3000_00);
    expect((await store.getQuoteByNumber(SHOP, "KT-0001"))?.items).toHaveLength(2);
    expect(await store.getQuoteByNumber(OTHER, "KT-0001")).toBeNull();
  });

  it("selling a quote makes the lead a customer, closes their calls, and leaves other open quotes alone", async () => {
    const { p, lead } = await setup();
    const content = priceQuote([p], [{ productId: p.id, qtyBoxes: 3 }], 0, "");
    const q1 = await store.createQuote(SHOP, lead.id, content, { prefix: "KT", publicKey: "k1" });
    const q2 = await store.createQuote(SHOP, lead.id, content, { prefix: "KT", publicKey: "k2" });
    await store.createFollowup(SHOP, { leadId: lead.id, kind: "call", dueAt: "2026-10-26T05:00:00.000Z" });
    const at = "2026-10-24T10:00:00.000Z";
    const result = await markQuoteSold(store, SHOP, q1, at);
    expect(result.quote).toMatchObject({ status: "sold", soldAt: at });
    expect(result.lead).toMatchObject({ status: "customer", convertedAt: at });
    expect((await store.getQuote(SHOP, q2.id))?.status).toBe("draft");
    expect(await store.listFollowups(SHOP, { leadId: lead.id, open: true })).toEqual([]);
    expect((await store.getLead(SHOP, lead.id))?.nextFollowUpAt).toBeNull();
  });

  it("counts Today: new leads this week, open quotes, sold this month, calls due", async () => {
    const { p, lead } = await setup();
    const now = new Date("2026-10-24T06:00:00Z");
    const q = await store.createQuote(SHOP, lead.id, priceQuote([p], [{ productId: p.id, qtyBoxes: 2 }], 0, ""), { prefix: "KT", publicKey: "k" });
    await store.createQuote(SHOP, lead.id, priceQuote([p], [{ productId: p.id, qtyBoxes: 1 }], 0, ""), { prefix: "KT", publicKey: "k2" });
    await store.setQuoteStatus(SHOP, q.id, "sold", "2026-10-23T06:00:00.000Z");
    const due = await store.createFollowup(SHOP, { leadId: lead.id, kind: "call", dueAt: "2026-10-24T05:00:00.000Z" });
    const counts = todayCounts(await store.listLeads(SHOP), await store.listQuotes(SHOP), [due], now);
    expect(counts).toEqual({ newLeadsThisWeek: 1, openQuotes: 1, soldThisMonth: 1, soldValueThisMonth: 2000_00, dueToday: 1 });
  });
});

describe("messages", () => {
  it("lists a shop's messages only", async () => {
    const lead = await store.createLead(SHOP, { name: "Asha Rao", phone: "9876500001", source: "walk-in", notes: "" });
    const other = await store.createLead(OTHER, { name: "Other", phone: "9876500002", source: "walk-in", notes: "" });
    const base = { quoteId: null, kind: "quote_sent" as const, provider: "fake" as const, toMasked: "••••0001", template: "crm_quote", providerMessageId: null, status: "sent" as const, error: null };
    await store.logMessage({ ...base, leadId: lead.id });
    await store.logMessage({ ...base, leadId: other.id });
    expect(await store.listMessages(SHOP)).toHaveLength(1);
    expect(await store.listMessages(SHOP, { leadId: other.id })).toEqual([]);
  });
});

describe("seed", () => {
  const now = new Date("2026-10-24T06:00:00Z");

  it("adds ~30 products, 6 leads and quotes in every state, and is safe to run twice", async () => {
    expect(await seedCrm(store, KALYANI, now)).toEqual({ products: 31, leads: 6 });
    expect(await seedCrm(store, KALYANI, now)).toEqual({ products: 0, leads: 0 });
    const products = await store.listProducts(SHOP);
    expect(products).toHaveLength(31);
    expect(new Set(products.map((p) => p.category))).toEqual(new Set(["floor", "wall", "outdoor", "bathroom", "kitchen"]));
    expect(products.filter((p) => !p.active)).toHaveLength(1);
    const quotes = await store.listQuotes(SHOP);
    expect(new Set(quotes.map((q) => q.status))).toEqual(new Set(["draft", "sent", "sold", "lost"]));
    expect(quotes.map((q) => q.number).sort()).toEqual(["KT-0001", "KT-0002", "KT-0003", "KT-0004", "KT-0005"]);
    const leads = await store.listLeads(SHOP);
    expect(leads.map((l) => l.status).sort()).toEqual(["customer", "lead", "lead", "lead", "lead", "lost"]);
    expect(leads.every((l) => SEED_PHONES.has(l.phone))).toBe(true);
  });

  it("prices seed sq ft per box from the tile size", () => {
    const bySku = new Map(seedProducts("KT").map((p) => [p.sku, p]));
    expect(bySku.get("KT-F601")?.sqftPerBox).toBe(15.5);
    expect(bySku.get("KT-F606")?.sqftPerBox).toBe(27.56);
    expect(bySku.get("KT-W302")?.sqftPerBox).toBe(11.63);
  });

  it("seeds the memory store on the first request when there is no database", async () => {
    resetMemoryCrmStore({ seed: true });
    const s = await getCrmStore();
    expect(s.kind).toBe("memory");
    expect((await s.listLeads(SHOP)).length).toBe(6);
    // A second call does not seed again.
    await getCrmStore();
    expect((await s.listLeads(SHOP)).length).toBe(6);
  });
});
