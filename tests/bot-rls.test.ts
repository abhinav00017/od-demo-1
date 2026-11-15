// @vitest-environment node
/**
 * Organizations, org_id and Ogi's lock, on a real Postgres engine (PGlite, Postgres compiled to WebAssembly, in
 * process). No network and no Neon. The app's role is played by app_owner: no superuser, CREATEROLE, owns the tables,
 * like Neon's owner role. Every schema.sql statement runs as app_owner, exactly as scripts/migrate.ts sends them.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { schemaStatements } from "@/lib/bookings/migrations";
import { BOT_TABLES, botStatements, type BotTable } from "@/lib/db/botScope";
import { orgId, UnknownOrgError } from "@/lib/orgs";

const statements = schemaStatements(readFileSync(path.join(process.cwd(), "lib/bookings/schema.sql"), "utf8"));
const TABLES = [...BOT_TABLES];
const LOTUS = "org_7f3k2a";
const KALYANI = "org_2m9qd1";
/** Test-only organizations. Not in schema.sql's seed, and not in lib/orgs.ts, so the helper refuses them. */
const SUNRISE = "org_9x4hb7";
const SECOND_SHOP = "org_5t7wq3";
const CLINIC_TABLES: BotTable[] = ["bookings", "messages", "patient_notes", "whatsapp_optouts", "whatsapp_unreachable"];
const CRM_TABLES: BotTable[] = ["crm_products", "crm_leads", "crm_quotes", "crm_quote_items", "crm_followups"];
/** Where the old schema ends: everything before this statement is what Neon runs today. */
const ORGS_AT = statements.findIndex((s) => s.startsWith("CREATE TABLE IF NOT EXISTS organizations"));

/** A fresh database where app_owner (not a superuser) will run the schema. */
async function freshDb() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE app_owner NOLOGIN CREATEROLE; GRANT CREATE ON SCHEMA public TO app_owner; SET ROLE app_owner;`);
  return db;
}

async function migrate(db: PGlite, from = 0, to = statements.length) {
  for (const s of statements.slice(from, to)) await db.query(s);
}

/** Runs the helper's exact statements in one read-only transaction, as Neon's transaction() does. Returns the read's rows. */
async function botRead(db: PGlite, org: string, text: string, params: unknown[] = []) {
  const steps = botStatements(orgId(org), text, params);
  await db.query("BEGIN READ ONLY");
  try {
    let rows: unknown[] = [];
    for (const s of steps) rows = (await db.query(s.text, s.params)).rows;
    await db.query("COMMIT");
    return rows as Record<string, unknown>[];
  } catch (err) {
    await db.query("ROLLBACK");
    throw err;
  }
}

/** Switches to ogi_bot by hand, with any app.org_id (or none), skipping the helper. Rolls back at the end. */
async function rawBot(db: PGlite, setup: string[], text: string, opts: { readOnly?: boolean } = {}) {
  await db.query(opts.readOnly === false ? "BEGIN" : "BEGIN READ ONLY");
  try {
    await db.query("SET LOCAL ROLE ogi_bot");
    for (const s of setup) await db.query(s);
    return (await db.query(text)).rows as Record<string, unknown>[];
  } finally {
    await db.query("ROLLBACK");
  }
}

const asOrg = (org: string) => [`SELECT set_config('app.org_id', '${org}', true)`];
const count = async (db: PGlite, org: string, table: BotTable) => Number((await botRead(db, org, `SELECT count(*)::int AS n FROM ${table}`))[0].n);
/** Counts by hand as ogi_bot, for test-only organizations the helper refuses. */
const rawCount = async (db: PGlite, org: string, table: BotTable) => Number((await rawBot(db, asOrg(org), `SELECT count(*)::int AS n FROM ${table}`))[0].n);

type Row = Record<string, string>;
const one = async (db: PGlite, text: string, params: unknown[] = []) => ((await db.query(text, params)).rows[0] ?? {}) as Row;

/** Every row's org_id and xmin, per table. xmin changes whenever a row is updated, even to the same values. */
async function snapshot(db: PGlite) {
  const out: Record<string, unknown[]> = {};
  for (const t of TABLES) out[t] = (await db.query(`SELECT ctid::text AS at, xmin::text AS xmin, org_id FROM ${t} ORDER BY ctid`)).rows;
  return out;
}

/** Inserts rows the way the app does: never with org_id. The triggers and defaults fill it. */
async function insertDemoRows(db: PGlite) {
  const ids: Row = {};
  ids.booking = (await one(db, `INSERT INTO bookings (clinic_slug, name, phone, visit_type, date, slot, reason) VALUES ('lotus-clinic', 'Test Patient', '9000000001', 'clinic', '2026-11-20', 'Morning', 'Checkup') RETURNING id`)).id;
  await one(db, `INSERT INTO messages (booking_id, kind, to_masked, template) VALUES ($1, 'confirmation', '****0001', 'booking_confirmed')`, [ids.booking]);
  await one(db, `INSERT INTO patient_notes (clinic_slug, phone, notes) VALUES ('lotus-clinic', '9000000001', 'Prefers mornings')`);
  await one(db, `INSERT INTO whatsapp_optouts (phone) VALUES ('9000000002')`);
  await one(db, `INSERT INTO whatsapp_unreachable (phone, reason) VALUES ('9000000003', 'not on WhatsApp')`);
  ids.product = (await one(db, `INSERT INTO crm_products (sku, name, brand, category, size_mm, finish, price_per_box, sqft_per_box, pieces_per_box) VALUES ('T-1', 'Test Tile', 'Brand', 'floor', '600x600', 'matt', 100000, 15.5, 4) RETURNING id`)).id;
  ids.lead = (await one(db, `INSERT INTO crm_leads (name, phone, source) VALUES ('Test Buyer', '9000000004', 'walk-in') RETURNING id`)).id;
  ids.quote = (await one(db, `INSERT INTO crm_quotes (lead_id, seq, number, public_key) VALUES ($1, 1, 'KT-0001', 'pk-test') RETURNING id`, [ids.lead])).id;
  await one(db, `INSERT INTO crm_quote_items (quote_id, product_id, qty_boxes, unit_price, line_total) VALUES ($1, $2, 3, 100000, 300000)`, [ids.quote, ids.product]);
  await one(db, `INSERT INTO crm_followups (lead_id, kind, due_at) VALUES ($1, 'call', now())`, [ids.lead]);
  // A CRM WhatsApp send, the way lib/crm/postgres.ts logs it. It shares the messages table with clinic sends.
  await one(db, `INSERT INTO messages (crm_lead_id, crm_quote_id, kind, channel, provider, to_masked, template, status) VALUES ($1, $2, 'quote_sent', 'whatsapp', 'fake', '****0004', 'quote', 'sent')`, [ids.lead, ids.quote]);
  return ids;
}

describe("organizations and org_id on real Postgres (PGlite)", () => {
  let db: PGlite;
  let ids: Row = {};

  beforeAll(async () => {
    db = await freshDb();
    await migrate(db);
    await migrate(db); // Safe to rerun.
    ids = await insertDemoRows(db);
    // Even an insert that claims Lotus is labelled with its lead's organization.
    await one(db, `INSERT INTO messages (crm_lead_id, kind, to_masked, template, org_id) VALUES ($1, 'crm_reminder', '****0004', 'reminder', '${LOTUS}')`, [ids.lead]);
  }, 60_000);

  afterAll(async () => {
    await db?.close();
  });

  it("seeds the two organizations with their fixed ids, once", async () => {
    await migrate(db, ORGS_AT, ORGS_AT + 2);
    const { rows } = await db.query(`SELECT id, slug, name, product FROM organizations ORDER BY slug`);
    expect(rows).toEqual([
      { id: KALYANI, slug: "kalyani-tiles", name: "Kalyani Tiles", product: "tiles" },
      { id: LOTUS, slug: "lotus-clinic", name: "Lotus Women's Clinic", product: "clinic" },
    ]);
  });

  it("covers every table, and every table has a NOT NULL org_id that references organizations, with an index", async () => {
    const { rows: tables } = await db.query<{ t: string }>(`SELECT tablename AS t FROM pg_tables WHERE schemaname = 'public' ORDER BY 1`);
    expect(tables.map((r) => r.t)).toEqual([...TABLES, "organizations"].sort());
    for (const t of TABLES) {
      const { rows } = await db.query<{ is_nullable: string; column_default: string | null }>(
        `SELECT is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'org_id'`,
        [t],
      );
      // Only the WhatsApp lists have a default. Every other table is filled by its trigger.
      const expected = t.startsWith("whatsapp_") ? `'${LOTUS}'::text` : null;
      expect(rows, t).toEqual([{ is_nullable: "NO", column_default: expected }]);
      const { rows: fks } = await db.query(
        `SELECT 1 FROM pg_constraint WHERE contype = 'f' AND conrelid = $1::regclass AND confrelid = 'organizations'::regclass`,
        [t],
      );
      expect(fks, t).toHaveLength(1); // Not doubled by the rerun.
      const { rows: idx } = await db.query(`SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = $1 AND indexname = $2`, [t, `${t}_org_idx`]);
      expect(idx, t).toHaveLength(1);
    }
    const { rows: triggers } = await db.query<{ t: string }>(
      `SELECT tgrelid::regclass::text AS t FROM pg_trigger WHERE NOT tgisinternal AND tgname = tgrelid::regclass::text || '_org_id' ORDER BY 1`,
    );
    expect(triggers.map((r) => r.t)).toEqual(TABLES.filter((t) => !t.startsWith("whatsapp_")).sort());
  });

  it("turns RLS on for every table without FORCE, with one SELECT-only policy for ogi_bot on app.org_id", async () => {
    const { rows } = await db.query<{ t: string; rls: boolean; force: boolean }>(
      `SELECT relname AS t, relrowsecurity AS rls, relforcerowsecurity AS force FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND relname <> 'organizations' ORDER BY 1`,
    );
    expect(rows).toEqual([...TABLES].sort().map((t) => ({ t, rls: true, force: false })));
    const { rows: policies } = await db.query<{ t: string; name: string; cmd: string; roles: string; qual: string }>(
      `SELECT tablename AS t, policyname AS name, cmd, roles::text AS roles, qual FROM pg_policies WHERE schemaname = 'public' ORDER BY 1`,
    );
    expect(policies).toHaveLength(TABLES.length);
    for (const p of policies) {
      expect(p).toMatchObject({ name: "ogi_bot_read", cmd: "SELECT", roles: "{ogi_bot}" });
      expect(p.qual).toContain("(org_id = NULLIF(current_setting('app.org_id'::text, true), ''::text))");
    }
  });

  it("makes ogi_bot a role nobody can log in as, with no special powers", async () => {
    const { rows } = await db.query(`SELECT rolcanlogin, rolsuper, rolbypassrls, rolcreaterole, rolcreatedb FROM pg_roles WHERE rolname = 'ogi_bot'`);
    expect(rows).toEqual([{ rolcanlogin: false, rolsuper: false, rolbypassrls: false, rolcreaterole: false, rolcreatedb: false }]);
  });

  it("gives ogi_bot SELECT and no write privilege on any table, and nothing at all on organizations", async () => {
    for (const t of [...TABLES, "organizations"]) {
      const { rows } = await db.query<Record<string, boolean>>(
        `SELECT has_table_privilege('ogi_bot', $1, 'SELECT') AS sel, has_table_privilege('ogi_bot', $1, 'INSERT') AS ins,
           has_table_privilege('ogi_bot', $1, 'UPDATE') AS upd, has_table_privilege('ogi_bot', $1, 'DELETE') AS del,
           has_table_privilege('ogi_bot', $1, 'TRUNCATE') AS trunc, has_table_privilege('ogi_bot', $1, 'REFERENCES') AS refs,
           has_table_privilege('ogi_bot', $1, 'TRIGGER') AS trig`,
        [t],
      );
      expect(rows[0], t).toEqual({ sel: t !== "organizations", ins: false, upd: false, del: false, trunc: false, refs: false, trig: false });
    }
  });

  it("labels every row with its organization's fixed id, from its slug, its quote, or its booking or lead", async () => {
    for (const t of CLINIC_TABLES.filter((t) => t !== "messages")) {
      const { rows } = await db.query<{ org_id: string }>(`SELECT DISTINCT org_id FROM ${t}`);
      expect(rows.map((r) => r.org_id), t).toEqual([LOTUS]);
    }
    for (const t of CRM_TABLES) {
      const { rows } = await db.query<{ org_id: string }>(`SELECT DISTINCT org_id FROM ${t}`);
      expect(rows.map((r) => r.org_id), t).toEqual([KALYANI]);
    }
    const { rows } = await db.query(`SELECT template, org_id FROM messages ORDER BY template`);
    expect(rows).toEqual([
      { template: "booking_confirmed", org_id: LOTUS },
      { template: "quote", org_id: KALYANI },
      { template: "reminder", org_id: KALYANI },
    ]);
  });

  it("attack: the bot for Lotus sees zero CRM rows, and only clinic messages", async () => {
    for (const t of CRM_TABLES) expect(await count(db, LOTUS, t), t).toBe(0);
    for (const t of CLINIC_TABLES) expect(await count(db, LOTUS, t), t).toBeGreaterThan(0);
    const msgs = await botRead(db, LOTUS, `SELECT kind, booking_id, crm_lead_id FROM messages`);
    expect(msgs).toEqual([{ kind: "confirmation", booking_id: ids.booking, crm_lead_id: null }]);
  });

  it("attack: the bot for Kalyani sees zero clinic rows, and gets the CRM messages, even one inserted claiming Lotus", async () => {
    for (const t of CLINIC_TABLES.filter((t) => t !== "messages")) expect(await count(db, KALYANI, t), t).toBe(0);
    for (const t of CRM_TABLES) expect(await count(db, KALYANI, t), t).toBeGreaterThan(0);
    const msgs = await botRead(db, KALYANI, `SELECT kind FROM messages ORDER BY kind`);
    expect(msgs.map((m) => m.kind)).toEqual(["crm_reminder", "quote_sent"]);
  });

  it("attack: a bot query that asks for another organization by WHERE still gets nothing", async () => {
    expect(await botRead(db, LOTUS, `SELECT id FROM crm_leads WHERE org_id = '${KALYANI}' OR true`)).toEqual([]);
    expect(await botRead(db, LOTUS, `SELECT id FROM crm_leads WHERE id = $1`, [ids.lead])).toEqual([]);
  });

  it("attack: ogi_bot with no organization set, an empty one, a slug, or an unknown one sees zero rows of every table", async () => {
    for (const t of TABLES) {
      expect(await rawBot(db, [], `SELECT * FROM ${t}`), `${t} unset`).toEqual([]);
      expect(await rawBot(db, asOrg(""), `SELECT * FROM ${t}`), `${t} empty`).toEqual([]);
      expect(await rawBot(db, asOrg("lotus-clinic"), `SELECT * FROM ${t}`), `${t} slug`).toEqual([]);
      expect(await rawBot(db, asOrg("org_unknown"), `SELECT * FROM ${t}`), `${t} unknown`).toEqual([]);
    }
  });

  it("attack: ogi_bot cannot INSERT, UPDATE, DELETE or TRUNCATE any table, even in a read-write transaction with its own organization set", async () => {
    for (const t of TABLES) {
      const org = CRM_TABLES.includes(t) ? KALYANI : LOTUS;
      for (const write of [`INSERT INTO ${t} (org_id) VALUES ('${org}')`, `UPDATE ${t} SET org_id = org_id`, `DELETE FROM ${t}`, `TRUNCATE ${t} CASCADE`]) {
        await expect(rawBot(db, asOrg(org), write, { readOnly: false }), `${t}: ${write}`).rejects.toThrow(/permission denied/);
      }
    }
  });

  it("leaves no role or organization behind after a bot read", async () => {
    await botRead(db, LOTUS, `SELECT 1 AS one`);
    const { rows } = await db.query(`SELECT current_user AS who, current_setting('app.org_id', true) AS org`);
    expect(rows).toEqual([{ who: "app_owner", org: "" }]);
  });

  it("rejects an organization the server does not know before any SQL exists", () => {
    expect(() => orgId(SUNRISE)).toThrow(UnknownOrgError);
    expect(() => botStatements("lotus-clinic" as never, "SELECT 1")).toThrow(UnknownOrgError);
  });

  it("keeps the app (the table owner) reading and writing every row as before", async () => {
    for (const t of TABLES) {
      const { rows } = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${t}`);
      expect(rows[0].n, t).toBeGreaterThan(0);
    }
    await db.query(`UPDATE bookings SET notes = 'seen' WHERE id = $1`, [ids.booking]);
    await db.query(`UPDATE messages SET status = 'delivered' WHERE booking_id = $1`, [ids.booking]);
    await db.query(`INSERT INTO patient_notes (clinic_slug, phone, notes) VALUES ('lotus-clinic', '9000000001', 'Upserted') ON CONFLICT (clinic_slug, phone) DO UPDATE SET notes = EXCLUDED.notes`);
    expect(await one(db, `SELECT notes, org_id FROM bookings WHERE id = $1`, [ids.booking])).toEqual({ notes: "seen", org_id: LOTUS });
    expect(await one(db, `SELECT notes, org_id FROM patient_notes WHERE phone = '9000000001'`)).toEqual({ notes: "Upserted", org_id: LOTUS });
  });

  it("attack: code cannot set or change org_id by hand; the database keeps it right", async () => {
    // An insert that names another organization is labelled from its slug anyway.
    const b = await one(db, `INSERT INTO bookings (clinic_slug, name, phone, visit_type, date, slot, reason, org_id) VALUES ('lotus-clinic', 'Claims Kalyani', '9000000011', 'clinic', '2026-11-21', 'Morning', 'Checkup', '${KALYANI}') RETURNING id, org_id`);
    expect(b.org_id).toBe(LOTUS);
    // An update that moves org_id alone is undone.
    await db.query(`UPDATE bookings SET org_id = '${KALYANI}' WHERE id = $1`, [b.id]);
    await db.query(`UPDATE crm_leads SET org_id = '${LOTUS}' WHERE id = $1`, [ids.lead]);
    await db.query(`UPDATE crm_quote_items SET org_id = '${LOTUS}' WHERE quote_id = $1`, [ids.quote]);
    await db.query(`UPDATE messages SET org_id = '${LOTUS}' WHERE crm_lead_id = $1`, [ids.lead]);
    expect((await one(db, `SELECT org_id FROM bookings WHERE id = $1`, [b.id])).org_id).toBe(LOTUS);
    expect((await one(db, `SELECT org_id FROM crm_leads WHERE id = $1`, [ids.lead])).org_id).toBe(KALYANI);
    expect((await db.query(`SELECT DISTINCT org_id FROM crm_quote_items WHERE quote_id = $1`, [ids.quote])).rows).toEqual([{ org_id: KALYANI }]);
    expect((await db.query(`SELECT DISTINCT org_id FROM messages WHERE crm_lead_id = $1`, [ids.lead])).rows).toEqual([{ org_id: KALYANI }]);
    await db.query(`DELETE FROM bookings WHERE id = $1`, [b.id]);
  });

  it("refuses an insert whose slug matches no organization, on every slug table", async () => {
    const tries = [
      `INSERT INTO bookings (clinic_slug, name, phone, visit_type, date, slot, reason) VALUES ('no-such-clinic', 'X', '9000000021', 'clinic', '2026-11-20', 'Morning', 'Checkup')`,
      `INSERT INTO patient_notes (clinic_slug, phone, notes) VALUES ('no-such-clinic', '9000000021', 'x')`,
      `INSERT INTO crm_products (shop_slug, sku, name, brand, category, size_mm, finish, price_per_box, sqft_per_box, pieces_per_box) VALUES ('no-such-shop', 'T-9', 'X', 'B', 'floor', '600x600', 'matt', 1, 1, 1)`,
      `INSERT INTO crm_leads (shop_slug, name, phone, source) VALUES ('no-such-shop', 'X', '9000000021', 'walk-in')`,
      `INSERT INTO crm_quotes (shop_slug, lead_id, seq, number, public_key) VALUES ('no-such-shop', '${ids.lead}', 99, 'KT-0099', 'pk-x')`,
      `INSERT INTO crm_followups (shop_slug, lead_id, kind, due_at) VALUES ('no-such-shop', '${ids.lead}', 'call', now())`,
    ];
    for (const sql of tries) await expect(db.query(sql), sql).rejects.toThrow(/no organization has this/);
    // Moving a row to an unknown slug is refused too.
    await expect(db.query(`UPDATE bookings SET clinic_slug = 'no-such-clinic' WHERE id = $1`, [ids.booking])).rejects.toThrow(/no organization has this/);
    expect((await one(db, `SELECT count(*)::int AS n FROM bookings WHERE clinic_slug = 'no-such-clinic'`)).n).toBe(0);
  });

  it("moves messages that disagree with their parent to the parent's organization when the schema reruns", async () => {
    await db.query(`ALTER TABLE messages DISABLE TRIGGER messages_org_id`);
    await db.query(`INSERT INTO messages (crm_lead_id, kind, to_masked, template, org_id) VALUES ($1, 'quote_sent', '****0004', 'old_send', '${LOTUS}')`, [ids.lead]);
    await db.query(`ALTER TABLE messages ENABLE TRIGGER messages_org_id`);
    expect(await one(db, `SELECT org_id FROM messages WHERE template = 'old_send'`)).toEqual({ org_id: LOTUS });
    await migrate(db);
    expect(await one(db, `SELECT org_id FROM messages WHERE template = 'old_send'`)).toEqual({ org_id: KALYANI });
  });

  it("changes no row when the schema reruns", async () => {
    await migrate(db); // Settles any earlier backfill (view tokens on rows inserted by hand).
    const before = await snapshot(db);
    await migrate(db);
    expect(await snapshot(db)).toEqual(before);
  });
});

describe("a third organization (test-only: Sunrise clinic)", () => {
  let db: PGlite;
  const ids: Row = {};

  beforeAll(async () => {
    db = await freshDb();
    await migrate(db);
    await insertDemoRows(db);
    // Adding a client is one row. No code change, no schema change.
    await db.query(`INSERT INTO organizations (id, slug, name, product) VALUES ('${SUNRISE}', 'sunrise-clinic', 'Sunrise Clinic', 'clinic')`);
    ids.booking = (await one(db, `INSERT INTO bookings (clinic_slug, name, phone, visit_type, date, slot, reason) VALUES ('sunrise-clinic', 'Sunrise Patient', '9000000031', 'clinic', '2026-11-22', 'Evening', 'Checkup') RETURNING id`)).id;
    await db.query(`INSERT INTO patient_notes (clinic_slug, phone, notes) VALUES ('sunrise-clinic', '9000000031', 'Sunrise note')`);
    await db.query(`INSERT INTO messages (booking_id, kind, to_masked, template) VALUES ($1, 'confirmation', '****0031', 'sunrise_confirmed')`, [ids.booking]);
  }, 60_000);

  afterAll(async () => {
    await db?.close();
  });

  it("labels its bookings, notes and messages with its own org_id automatically", async () => {
    for (const t of ["bookings", "patient_notes", "messages"] as const) {
      const { rows } = await db.query(`SELECT org_id FROM ${t} WHERE org_id = '${SUNRISE}'`);
      expect(rows, t).toHaveLength(1);
    }
    expect(await one(db, `SELECT org_id FROM bookings WHERE id = $1`, [ids.booking])).toEqual({ org_id: SUNRISE });
  });

  it("attack: the Lotus bot sees zero Sunrise rows, and a Sunrise reader sees zero Lotus rows", async () => {
    expect(await botRead(db, LOTUS, `SELECT id FROM bookings WHERE id = $1`, [ids.booking])).toEqual([]);
    const lotusNames = await botRead(db, LOTUS, `SELECT name FROM bookings`);
    expect(lotusNames).toEqual([{ name: "Test Patient" }]);
    expect(await botRead(db, LOTUS, `SELECT template FROM messages`)).toEqual([{ template: "booking_confirmed" }]);
    expect(await botRead(db, LOTUS, `SELECT notes FROM patient_notes`)).toEqual([{ notes: "Prefers mornings" }]);
    // Sunrise is not on the server's list, so the helper refuses it; the lock is checked by hand as ogi_bot.
    expect(await rawBot(db, asOrg(SUNRISE), `SELECT name FROM bookings`)).toEqual([{ name: "Sunrise Patient" }]);
    expect(await rawBot(db, asOrg(SUNRISE), `SELECT template FROM messages`)).toEqual([{ template: "sunrise_confirmed" }]);
    expect(await rawBot(db, asOrg(SUNRISE), `SELECT notes FROM patient_notes`)).toEqual([{ notes: "Sunrise note" }]);
    for (const t of CRM_TABLES) expect(await rawCount(db, SUNRISE, t), t).toBe(0);
    for (const t of ["whatsapp_optouts", "whatsapp_unreachable"] as const) expect(await rawCount(db, SUNRISE, t), t).toBe(0);
    for (const t of CRM_TABLES) expect(await count(db, KALYANI, t), t).toBeGreaterThan(0);
    expect(await count(db, KALYANI, "bookings")).toBe(0);
  });

  it("renaming an organization's slug changes no row's org_id; new rows then use the new slug", async () => {
    const before = await snapshot(db);
    await db.query(`UPDATE organizations SET slug = 'sunrise-womens' WHERE id = '${SUNRISE}'`);
    expect(await snapshot(db)).toEqual(before);

    // Old rows keep their organization and still work: an update that keeps the slug keeps the org.
    await db.query(`UPDATE bookings SET status = 'confirmed', notes = 'after rename' WHERE id = $1`, [ids.booking]);
    await db.query(`UPDATE messages SET status = 'delivered' WHERE booking_id = $1`, [ids.booking]);
    await db.query(`UPDATE patient_notes SET notes = 'after rename' WHERE clinic_slug = 'sunrise-clinic'`);
    expect(await one(db, `SELECT org_id, status FROM bookings WHERE id = $1`, [ids.booking])).toEqual({ org_id: SUNRISE, status: "confirmed" });
    expect(await one(db, `SELECT org_id, notes FROM patient_notes WHERE clinic_slug = 'sunrise-clinic'`)).toEqual({ org_id: SUNRISE, notes: "after rename" });

    // A new row with the old slug is refused; with the new slug it gets the same organization.
    await expect(
      db.query(`INSERT INTO bookings (clinic_slug, name, phone, visit_type, date, slot, reason) VALUES ('sunrise-clinic', 'Old Slug', '9000000032', 'clinic', '2026-11-23', 'Morning', 'Checkup')`),
    ).rejects.toThrow(/no organization has this/);
    const fresh = await one(db, `INSERT INTO bookings (clinic_slug, name, phone, visit_type, date, slot, reason) VALUES ('sunrise-womens', 'New Slug', '9000000033', 'clinic', '2026-11-23', 'Morning', 'Checkup') RETURNING org_id`);
    expect(fresh.org_id).toBe(SUNRISE);

    // A rerun of the schema after the rename moves nothing either.
    const afterRename = await snapshot(db);
    await migrate(db);
    await migrate(db);
    const settled = await snapshot(db);
    for (const t of TABLES) expect(settled[t].map((r) => (r as Row).org_id), t).toEqual(afterRename[t].map((r) => (r as Row).org_id));
    expect(await rawCount(db, SUNRISE, "bookings")).toBe(2);
  });

  it("gives a quote item its quote's organization, whatever the insert says", async () => {
    await db.query(`INSERT INTO organizations (id, slug, name, product) VALUES ('${SECOND_SHOP}', 'second-tiles', 'Second Tiles', 'tiles')`);
    const product = await one(db, `INSERT INTO crm_products (shop_slug, sku, name, brand, category, size_mm, finish, price_per_box, sqft_per_box, pieces_per_box) VALUES ('second-tiles', 'S-1', 'Tile', 'B', 'wall', '300x600', 'gloss', 5000, 10, 6) RETURNING id, org_id`);
    const lead = await one(db, `INSERT INTO crm_leads (shop_slug, name, phone, source) VALUES ('second-tiles', 'Second Buyer', '9000000041', 'call') RETURNING id, org_id`);
    const quote = await one(db, `INSERT INTO crm_quotes (shop_slug, lead_id, seq, number, public_key) VALUES ('second-tiles', $1, 1, 'ST-0001', 'pk-st') RETURNING id, org_id`, [lead.id]);
    expect([product.org_id, lead.org_id, quote.org_id]).toEqual([SECOND_SHOP, SECOND_SHOP, SECOND_SHOP]);
    const item = await one(db, `INSERT INTO crm_quote_items (quote_id, product_id, qty_boxes, unit_price, line_total, org_id) VALUES ($1, $2, 2, 5000, 10000, '${KALYANI}') RETURNING org_id`, [quote.id, product.id]);
    expect(item.org_id).toBe(SECOND_SHOP);
    // Kalyani's bot cannot see the second shop's item.
    expect(await botRead(db, KALYANI, `SELECT org_id FROM crm_quote_items`)).toEqual([{ org_id: KALYANI }]);
    // An item for a quote that does not exist is refused.
    await expect(
      db.query(`INSERT INTO crm_quote_items (quote_id, product_id, qty_boxes, unit_price, line_total) VALUES ('00000000-0000-4000-8000-000000000000', $1, 1, 1, 1)`, [product.id]),
    ).rejects.toThrow(/a quote item needs a quote/);
  });
});

describe("migrating a database on today's schema (what Neon holds now)", () => {
  it("fills org_id on every existing row, makes it NOT NULL, and a rerun changes nothing", async () => {
    const db = await freshDb();
    try {
      await migrate(db, 0, ORGS_AT); // The old schema: no organizations, no org_id.
      const { rows: cols } = await db.query(`SELECT 1 FROM information_schema.columns WHERE column_name = 'org_id'`);
      expect(cols).toEqual([]);
      await insertDemoRows(db); // Rows written before org_id existed.
      await migrate(db); // The final deploy runs the whole file.
      for (const t of TABLES) {
        const { rows } = await db.query<{ org_id: string; n: number }>(`SELECT org_id, count(*)::int AS n FROM ${t} GROUP BY 1 ORDER BY 1`);
        const expected =
          t === "messages" ? [{ org_id: KALYANI, n: 1 }, { org_id: LOTUS, n: 1 }] : [{ org_id: CRM_TABLES.includes(t) ? KALYANI : LOTUS, n: 1 }];
        expect(rows, t).toEqual(expected);
      }
      expect(await count(db, LOTUS, "bookings")).toBe(1);
      expect(await count(db, LOTUS, "crm_leads")).toBe(0);
      const before = await snapshot(db);
      await migrate(db);
      expect(await snapshot(db)).toEqual(before);
    } finally {
      await db.close();
    }
  }, 60_000);

  it("stops at SET NOT NULL when an existing row's slug matches no organization, and leaves RLS off", async () => {
    const db = await freshDb();
    try {
      await migrate(db, 0, ORGS_AT);
      await db.query(`INSERT INTO bookings (clinic_slug, name, phone, visit_type, date, slot, reason) VALUES ('mystery-clinic', 'X', '9000000051', 'clinic', '2026-11-20', 'Morning', 'Checkup')`);
      await expect(migrate(db)).rejects.toThrow(/org_id.*not-null|null values/);
      const { rows } = await db.query(`SELECT count(*)::int AS n FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relrowsecurity`);
      expect(rows).toEqual([{ n: 0 }]);
    } finally {
      await db.close();
    }
  }, 60_000);
});

describe("migration guard", () => {
  it("stops before turning RLS on when the app's role does not own a table", async () => {
    const db = await freshDb();
    try {
      // Up to the role grant: tables, columns and ogi_bot exist, RLS not on yet.
      const rlsAt = statements.findIndex((s) => s.includes("ENABLE ROW LEVEL SECURITY"));
      await migrate(db, 0, rlsAt);
      await db.exec(`RESET ROLE; CREATE ROLE someone_else NOLOGIN; ALTER TABLE whatsapp_unreachable OWNER TO someone_else; SET ROLE app_owner;`);
      await expect(db.query(statements[rlsAt])).rejects.toThrow(/whatsapp_unreachable is not owned by app_owner/);
      const { rows } = await db.query(`SELECT count(*)::int AS n FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relrowsecurity`);
      expect(rows).toEqual([{ n: 0 }]);
    } finally {
      await db.close();
    }
  }, 60_000);
});
