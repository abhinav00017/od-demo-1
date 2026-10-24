import { beforeEach, describe, expect, it, vi } from "vitest";

// No real database here. The Neon driver is replaced, so these tests check the SQL we send
// and how rows map back. They do not prove the SQL runs on Postgres.
const query = vi.fn();
vi.mock("@neondatabase/serverless", () => ({ neon: () => ({ query }) }));

const { postgresCrmStore } = await import("@/lib/crm/postgres");
const { DuplicateError } = await import("@/lib/crm/types");

const SHOP = "kalyani-tiles";
const LEAD_ID = "0f8e2c1a-1111-4222-8333-444455556666";
const QUOTE_ID = "1f8e2c1a-1111-4222-8333-444455556666";
const PRODUCT_ID = "2f8e2c1a-1111-4222-8333-444455556666";

const leadRow = {
  id: LEAD_ID,
  shop_slug: SHOP,
  name: "Asha Rao",
  phone: "9876500001",
  status: "lead",
  source: "walk-in",
  notes: "",
  next_follow_up_at: null,
  last_contact_at: new Date("2026-10-20T05:00:00Z"),
  created_at: new Date("2026-10-20T05:00:00Z"),
  converted_at: null,
};

// Neon hands bigint and numeric back as strings.
const quoteRow = {
  id: QUOTE_ID,
  shop_slug: SHOP,
  lead_id: LEAD_ID,
  seq: 7,
  number: "KT-0007",
  public_key: "key",
  status: "draft",
  subtotal: "900000",
  discount: "50000",
  total: "850000",
  sent_at: null,
  sold_at: null,
  notes: "",
  created_at: new Date("2026-10-24T05:00:00Z"),
};

const itemRow = {
  id: "3f8e2c1a-1111-4222-8333-444455556666",
  quote_id: QUOTE_ID,
  product_id: PRODUCT_ID,
  position: 0,
  qty_boxes: 9,
  area_sqft: "120.00",
  wastage_pct: "10.00",
  unit_price: "100000",
  line_total: "900000",
  sku: "KT-F601",
  name: "Carrara Gloss",
  brand: "Vitrano",
  category: "floor",
  size_mm: "600x600",
  finish: "Glossy",
  sqft_per_box: "15.500",
  pieces_per_box: 4,
  price_per_box: "108500",
};

const content = {
  items: [{ productId: PRODUCT_ID, qtyBoxes: 9, areaSqft: 120, wastagePct: 10, unitPrice: 100000, lineTotal: 900000 }],
  subtotal: 900000,
  discount: 50000,
  total: 850000,
  notes: "",
};

describe("postgres CRM store (driver mocked)", () => {
  beforeEach(() => query.mockReset());

  it("creates a lead, and on a duplicate number throws DuplicateError with the existing id", async () => {
    query.mockResolvedValueOnce([leadRow]);
    const store = postgresCrmStore("postgres://x");
    const lead = await store.createLead(SHOP, { name: "Asha Rao", phone: "9876500001", source: "walk-in", notes: "" }, "2026-10-20T05:00:00.000Z");
    expect(lead).toMatchObject({ id: LEAD_ID, lastContactAt: "2026-10-20T05:00:00.000Z", convertedAt: null });
    expect(query.mock.calls[0][0]).toMatch(/ON CONFLICT \(shop_slug, phone\) DO NOTHING/);

    query.mockReset();
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: LEAD_ID }]);
    const err = await store.createLead(SHOP, { name: "X", phone: "9876500001", source: "call", notes: "" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(DuplicateError);
    expect((err as InstanceType<typeof DuplicateError>).existingId).toBe(LEAD_ID);
    expect(query.mock.calls[1]).toEqual([`SELECT id FROM crm_leads WHERE shop_slug = $1 AND phone = $2`, [SHOP, "9876500001"]]);
  });

  it("turns a unique violation on SKU into DuplicateError", async () => {
    query.mockRejectedValueOnce(Object.assign(new Error("duplicate key"), { code: "23505", constraint: "crm_products_shop_slug_sku_key" }));
    const store = postgresCrmStore("postgres://x");
    await expect(
      store.createProduct(SHOP, { sku: "A", name: "A", brand: "B", category: "floor", sizeMm: "600x600", finish: "M", pricePerBox: 1, sqftPerBox: 1, piecesPerBox: 1, imageUrl: null, active: true }),
    ).rejects.toBeInstanceOf(DuplicateError);
  });

  it("creates a quote with the next per-shop number and its items in one statement, then reads it back as numbers", async () => {
    query.mockResolvedValueOnce([quoteRow]).mockResolvedValueOnce([itemRow]);
    const quote = await postgresCrmStore("postgres://x").createQuote(SHOP, LEAD_ID, content, { prefix: "KT", publicKey: "key", at: "2026-10-24T05:00:00.000Z" });
    const [text, params] = query.mock.calls[0];
    expect(text).toMatch(/WITH next AS \(SELECT COALESCE\(max\(seq\), 0\) \+ 1 AS seq FROM crm_quotes WHERE shop_slug = \$1\)/);
    expect(text).toContain("$3::text || '-' || lpad(next.seq::text, 4, '0')");
    expect(text).toContain("unnest($10::uuid[], $11::int[], $12::numeric[], $13::numeric[], $14::bigint[], $15::bigint[], $16::int[])");
    expect(params).toEqual([SHOP, LEAD_ID, "KT", "key", 900000, 50000, 850000, "", "2026-10-24T05:00:00.000Z", [PRODUCT_ID], [9], [120], [10], [100000], [900000], [0]]);
    expect(query.mock.calls[1][0]).toMatch(/FROM crm_quote_items i LEFT JOIN crm_products p ON p.id = i.product_id WHERE i.quote_id = \$1::uuid ORDER BY i.position/);
    expect(quote).toMatchObject({ number: "KT-0007", seq: 7, subtotal: 900000, discount: 50000, total: 850000, createdAt: "2026-10-24T05:00:00.000Z" });
    expect(quote.items[0]).toMatchObject({ qtyBoxes: 9, areaSqft: 120, wastagePct: 10, unitPrice: 100000, lineTotal: 900000, product: { name: "Carrara Gloss", sqftPerBox: 15.5, pricePerBox: 108500 } });
  });

  it("tries again when two saves pick the same quote number", async () => {
    query
      .mockRejectedValueOnce(Object.assign(new Error("duplicate key"), { code: "23505" }))
      .mockResolvedValueOnce([quoteRow])
      .mockResolvedValueOnce([]);
    const quote = await postgresCrmStore("postgres://x").createQuote(SHOP, LEAD_ID, content, { prefix: "KT", publicKey: "key" });
    expect(quote.number).toBe("KT-0007");
    expect(query).toHaveBeenCalledTimes(3);
  });

  it("saves a quote: totals, old items out and new items in, in one statement scoped to the shop", async () => {
    query.mockResolvedValueOnce([quoteRow]).mockResolvedValueOnce([itemRow]);
    await postgresCrmStore("postgres://x").saveQuote(SHOP, QUOTE_ID, content);
    const [text, params] = query.mock.calls[0];
    expect(text).toMatch(/UPDATE crm_quotes SET subtotal = \$3, discount = \$4, total = \$5, notes = \$6\s+WHERE shop_slug = \$1 AND id = \$2::uuid/);
    expect(text).toContain("DELETE FROM crm_quote_items WHERE quote_id IN (SELECT id FROM q)");
    expect(text).toContain("unnest($7::uuid[]");
    expect(params.slice(0, 6)).toEqual([SHOP, QUOTE_ID, 900000, 50000, 850000, ""]);
  });

  it("returns null for a quote in another shop", async () => {
    query.mockResolvedValueOnce([]);
    expect(await postgresCrmStore("postgres://x").getQuote("other", QUOTE_ID)).toBeNull();
    expect(query.mock.calls[0][1]).toEqual(["other", QUOTE_ID]);
  });

  it("sets sent_at or sold_at with the status", async () => {
    query.mockResolvedValueOnce([{ ...quoteRow, status: "sold", sold_at: new Date("2026-10-24T06:00:00Z") }]);
    const q = await postgresCrmStore("postgres://x").setQuoteStatus(SHOP, QUOTE_ID, "sold", "2026-10-24T06:00:00.000Z");
    expect(query.mock.calls[0][0]).toMatch(/sold_at = CASE WHEN \$3 = 'sold' THEN \$4::timestamptz ELSE sold_at END/);
    expect(q).toMatchObject({ status: "sold", soldAt: "2026-10-24T06:00:00.000Z" });
  });

  it("converts a lead once and moves last contact forward only", async () => {
    query.mockResolvedValue([{ ...leadRow, status: "customer", converted_at: new Date("2026-10-24T06:00:00Z") }]);
    const store = postgresCrmStore("postgres://x");
    expect(await store.markCustomer(SHOP, LEAD_ID, "2026-10-24T06:00:00.000Z")).toMatchObject({ status: "customer", convertedAt: "2026-10-24T06:00:00.000Z" });
    expect(query.mock.calls[0][0]).toContain("converted_at = COALESCE(converted_at, $3::timestamptz)");
    await store.touchLead(SHOP, LEAD_ID, "2026-10-24T06:00:00.000Z");
    expect(query.mock.calls[1][0]).toContain("last_contact_at = GREATEST(last_contact_at, $3::timestamptz)");
  });

  it("lists open follow-ups for a lead, and logs CRM messages against the lead, not a booking", async () => {
    query.mockResolvedValueOnce([]);
    const store = postgresCrmStore("postgres://x");
    await store.listFollowups(SHOP, { leadId: LEAD_ID, open: true });
    expect(query.mock.calls[0]).toEqual([
      "SELECT id, shop_slug, lead_id, quote_id, kind, due_at, done_at, result, created_at FROM crm_followups WHERE shop_slug = $1 AND lead_id = $2::uuid AND done_at IS NULL ORDER BY due_at LIMIT 2000",
      [SHOP, LEAD_ID],
    ]);
    const now = new Date("2026-10-24T06:00:00Z");
    query.mockResolvedValueOnce([
      { id: "m1", crm_lead_id: LEAD_ID, crm_quote_id: QUOTE_ID, kind: "quote_sent", provider: "fake", to_masked: "••••0001", template: "crm_quote", provider_message_id: null, status: "sent", error: null, created_at: now, updated_at: now },
    ]);
    const m = await store.logMessage({ leadId: LEAD_ID, quoteId: QUOTE_ID, kind: "quote_sent", provider: "fake", toMasked: "••••0001", template: "crm_quote", providerMessageId: null, status: "sent", error: null });
    expect(query.mock.calls[1][0]).toMatch(/^INSERT INTO messages \(crm_lead_id, crm_quote_id, kind, channel, provider/);
    expect(query.mock.calls[1][0]).not.toContain("booking_id");
    expect(m).toMatchObject({ leadId: LEAD_ID, kind: "quote_sent", createdAt: "2026-10-24T06:00:00.000Z" });
    query.mockResolvedValueOnce([]);
    await store.listMessages(SHOP, { leadId: LEAD_ID });
    expect(query.mock.calls[2][0]).toMatch(/JOIN crm_leads l ON l.id = m.crm_lead_id\s+WHERE l.shop_slug = \$1 AND m.crm_lead_id = \$2::uuid/);
  });
});
