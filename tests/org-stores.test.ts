// @vitest-environment node
/**
 * The app's own Postgres stores, unchanged, writing through the org_id triggers on a real Postgres engine (PGlite).
 * The Neon driver is replaced by a thin adapter that sends the stores' exact SQL to PGlite, so every insert and
 * update below is the text lib/bookings/postgres.ts and lib/crm/postgres.ts send to Neon. No network.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite, types } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const holder: { db?: PGlite } = {};

vi.mock("@neondatabase/serverless", () => {
  const run = async (text: string, params: unknown[] = []) => (await holder.db!.query(text, params)).rows;
  // Neon's query() is lazy: it runs when awaited, or inside transaction(). A thenable does the same.
  const query = (text: string, params: unknown[] = []) => ({ text, params, then: (ok: (v: unknown) => unknown, fail: (e: unknown) => unknown) => run(text, params).then(ok, fail) });
  const transaction = async (queries: { text: string; params: unknown[] }[]) => {
    await holder.db!.query("BEGIN");
    try {
      const out: unknown[] = [];
      for (const q of queries) out.push(await run(q.text, q.params));
      await holder.db!.query("COMMIT");
      return out;
    } catch (err) {
      await holder.db!.query("ROLLBACK");
      throw err;
    }
  };
  return { neon: () => ({ query, transaction }) };
});

const { schemaStatements } = await import("@/lib/bookings/migrations");
const { postgresStore } = await import("@/lib/bookings/postgres");
const { generateDemoData } = await import("@/lib/bookings/demoSeed");
const { postgresCrmStore } = await import("@/lib/crm/postgres");
const { seedCrm } = await import("@/lib/crm/seed");
const { KALYANI } = await import("@/lib/crm/shop");
const { botStatements } = await import("@/lib/db/botScope");
const { orgId } = await import("@/lib/orgs");

const LOTUS_ID = "org_7f3k2a";
const KALYANI_ID = "org_2m9qd1";
const URL = "postgres://pglite.invalid/test";

async function orgsIn(table: string) {
  const { rows } = await holder.db!.query<{ org_id: string; n: number }>(`SELECT org_id, count(*)::int AS n FROM ${table} GROUP BY 1 ORDER BY 1`);
  return rows;
}

async function botCount(org: string, table: string) {
  const db = holder.db!;
  await db.query("BEGIN READ ONLY");
  try {
    let rows: Record<string, unknown>[] = [];
    for (const s of botStatements(orgId(org), `SELECT count(*)::int AS n FROM ${table}`)) rows = (await db.query<Record<string, unknown>>(s.text, s.params)).rows;
    return Number(rows[0].n);
  } finally {
    await db.query("ROLLBACK");
  }
}

describe("the app's stores write through the org_id triggers unchanged (PGlite)", () => {
  beforeAll(async () => {
    // Neon hands bigint and numeric back as strings; match it so the stores map rows as they do in production.
    const db = new PGlite({ parsers: { [types.INT8]: (v: string) => v, [types.NUMERIC]: (v: string) => v } });
    await db.exec(`CREATE ROLE app_owner NOLOGIN CREATEROLE; GRANT CREATE ON SCHEMA public TO app_owner; SET ROLE app_owner;`);
    for (const s of schemaStatements(readFileSync(path.join(process.cwd(), "lib/bookings/schema.sql"), "utf8"))) await db.query(s);
    holder.db = db;
  }, 60_000);

  afterAll(async () => {
    await holder.db?.close();
  });

  it("CRM: the seed, a saved quote, a follow-up and a WhatsApp log all land in Kalyani's organization", async () => {
    const store = postgresCrmStore(URL);
    await seedCrm(store, KALYANI, new Date("2026-11-15T06:00:00Z"));
    const [lead] = await store.listLeads(KALYANI.slug);
    const products = await store.listProducts(KALYANI.slug);
    // createQuote and saveQuote insert the quote and its items in one statement (data-modifying CTEs).
    const quote = await store.createQuote(
      KALYANI.slug,
      lead.id,
      { items: [{ productId: products[0].id, qtyBoxes: 2, areaSqft: null, wastagePct: 10, unitPrice: 100000, lineTotal: 200000 }], subtotal: 200000, discount: 0, total: 200000, notes: "" },
      { prefix: KALYANI.prefix, publicKey: "pk-org-test" },
    );
    const saved = await store.saveQuote(KALYANI.slug, quote.id, {
      items: [{ productId: products[1].id, qtyBoxes: 3, areaSqft: null, wastagePct: 10, unitPrice: 50000, lineTotal: 150000 }],
      subtotal: 150000,
      discount: 0,
      total: 150000,
      notes: "saved",
    });
    expect(saved?.items).toHaveLength(1);
    await store.setQuoteStatus(KALYANI.slug, quote.id, "sent", new Date().toISOString());
    await store.createFollowup(KALYANI.slug, { leadId: lead.id, quoteId: quote.id, kind: "call", dueAt: new Date().toISOString() });
    await store.logMessage({ leadId: lead.id, quoteId: quote.id, kind: "quote_sent", provider: "fake", toMasked: "****0000", template: "quote", status: "sent", providerMessageId: null, error: null });
    await store.updateLead(KALYANI.slug, lead.id, { notes: "called" });

    for (const t of ["crm_products", "crm_leads", "crm_quotes", "crm_quote_items", "crm_followups"]) {
      const rows = await orgsIn(t);
      expect(rows.map((r) => r.org_id), t).toEqual([KALYANI_ID]);
      expect(rows[0].n, t).toBeGreaterThan(0);
    }
    expect((await orgsIn("messages")).map((r) => r.org_id)).toEqual([KALYANI_ID]);
    expect(await botCount(LOTUS_ID, "crm_quote_items")).toBe(0);
    expect(await botCount(KALYANI_ID, "crm_quote_items")).toBeGreaterThan(0);
  });

  it("Clinic: demo data, a website booking, notes, messages and the WhatsApp lists land in Lotus's organization", async () => {
    const store = postgresStore(URL);
    const result = await store.replaceDemoData("lotus-clinic", generateDemoData("2026-11-15"));
    expect(result.inserted).toBeGreaterThan(0);
    const b = await store.create({ clinicSlug: "lotus-clinic", name: "Org Test", phone: "9876543210", visitType: "clinic", date: "2026-11-20", slot: "Morning, 10 am – 1 pm", reason: "Pregnancy care" });
    await store.updateStatus(b.id, "confirmed");
    await store.setNotes({ clinicSlug: "lotus-clinic", phone: "9876543210", notes: "first" });
    await store.setNotes({ clinicSlug: "lotus-clinic", phone: "9876543210", notes: "second" });
    await store.logMessage({ bookingId: b.id, kind: "confirmation", toMasked: "****3210", template: "booking_confirmed", status: "sent", providerMessageId: "wamid.org-test", provider: "fake" });
    await store.updateMessageStatus("wamid.org-test", "delivered");
    await store.optOut("9876543211", "whatsapp");
    await store.markUnreachable("9876543212", "not on WhatsApp");

    for (const t of ["bookings", "patient_notes", "whatsapp_optouts", "whatsapp_unreachable"]) {
      expect((await orgsIn(t)).map((r) => r.org_id), t).toEqual([LOTUS_ID]);
    }
    // The CRM's message from the test above stays Kalyani's; every clinic message is Lotus's.
    expect((await orgsIn("messages")).map((r) => r.org_id)).toEqual([KALYANI_ID, LOTUS_ID].sort());
    expect(await botCount(KALYANI_ID, "bookings")).toBe(0);
    expect(await botCount(LOTUS_ID, "bookings")).toBe((await store.list({ clinicSlug: "lotus-clinic" })).length);
  });

  it("an unknown clinic slug is refused by the database, not stored without an organization", async () => {
    const store = postgresStore(URL);
    await expect(
      store.create({ clinicSlug: "no-such-clinic", name: "X", phone: "9876543219", visitType: "clinic", date: "2026-11-20", slot: "Morning, 10 am – 1 pm", reason: "Pregnancy care" }),
    ).rejects.toThrow(/no organization has this/);
  });
});
