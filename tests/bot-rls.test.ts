// @vitest-environment node
/**
 * Attack tests for Ogi's safety base, on a real Postgres engine (PGlite, Postgres compiled to WebAssembly, in process).
 * No network and no Neon. The app's role is played by app_owner: no superuser, CREATEROLE, owns the tables, like
 * Neon's owner role. Every schema.sql statement runs as app_owner, exactly as scripts/migrate.ts sends them.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { schemaStatements } from "@/lib/bookings/migrations";
import { BOT_TABLES, botStatements, businessId, UnknownBusinessError, type BotTable } from "@/lib/db/botScope";

const statements = schemaStatements(readFileSync(path.join(process.cwd(), "lib/bookings/schema.sql"), "utf8"));
const TABLES = Object.keys(BOT_TABLES) as BotTable[];
const CLINIC_TABLES = TABLES.filter((t) => BOT_TABLES[t] === "lotus-clinic");
const CRM_TABLES = TABLES.filter((t) => BOT_TABLES[t] === "kalyani-tiles");

/** A fresh database where app_owner (not a superuser) has run the whole schema. */
async function freshDb() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE app_owner NOLOGIN CREATEROLE; GRANT CREATE ON SCHEMA public TO app_owner; SET ROLE app_owner;`);
  return db;
}

async function migrate(db: PGlite) {
  for (const s of statements) await db.query(s);
}

/** Runs the helper's exact statements in one read-only transaction, as Neon's transaction() does. Returns the read's rows. */
async function botRead(db: PGlite, business: string, text: string, params: unknown[] = []) {
  const steps = botStatements(businessId(business), text, params);
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

/** Switches to ogi_bot by hand, with any app.business_id (or none), skipping the helper. Rolls back at the end. */
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

const count = async (db: PGlite, business: string, table: BotTable) => Number((await botRead(db, business, `SELECT count(*)::int AS n FROM ${table}`))[0].n);

describe("Ogi safety base on real Postgres (PGlite)", () => {
  let db: PGlite;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    db = await freshDb();
    await migrate(db);
    await migrate(db); // Safe to rerun.

    // Writes exactly as the app makes them today: no business_id anywhere. The defaults and the trigger fill it.
    const one = async (text: string, params: unknown[] = []) => ((await db.query(text, params)).rows[0] ?? {}) as Record<string, string>;
    ids.booking = (await one(`INSERT INTO bookings (clinic_slug, name, phone, visit_type, date, slot, reason) VALUES ('lotus-clinic', 'Test Patient', '9000000001', 'clinic', '2026-11-20', 'Morning', 'Checkup') RETURNING id`)).id;
    await one(`INSERT INTO messages (booking_id, kind, to_masked, template) VALUES ($1, 'confirmation', '****0001', 'booking_confirmed')`, [ids.booking]);
    await one(`INSERT INTO patient_notes (clinic_slug, phone, notes) VALUES ('lotus-clinic', '9000000001', 'Prefers mornings')`);
    await one(`INSERT INTO whatsapp_optouts (phone) VALUES ('9000000002')`);
    await one(`INSERT INTO whatsapp_unreachable (phone, reason) VALUES ('9000000003', 'not on WhatsApp')`);
    ids.product = (await one(`INSERT INTO crm_products (sku, name, brand, category, size_mm, finish, price_per_box, sqft_per_box, pieces_per_box) VALUES ('T-1', 'Test Tile', 'Brand', 'floor', '600x600', 'matt', 100000, 15.5, 4) RETURNING id`)).id;
    ids.lead = (await one(`INSERT INTO crm_leads (name, phone, source) VALUES ('Test Buyer', '9000000004', 'walk-in') RETURNING id`)).id;
    ids.quote = (await one(`INSERT INTO crm_quotes (lead_id, seq, number, public_key) VALUES ($1, 1, 'KT-0001', 'pk-test') RETURNING id`, [ids.lead])).id;
    await one(`INSERT INTO crm_quote_items (quote_id, product_id, qty_boxes, unit_price, line_total) VALUES ($1, $2, 3, 100000, 300000)`, [ids.quote, ids.product]);
    await one(`INSERT INTO crm_followups (lead_id, kind, due_at) VALUES ($1, 'call', now())`, [ids.lead]);
    // A CRM WhatsApp send, the way lib/crm/postgres.ts logs it. The clinic default would mislabel it; the trigger must not.
    await one(`INSERT INTO messages (crm_lead_id, crm_quote_id, kind, channel, provider, to_masked, template, status) VALUES ($1, $2, 'quote_sent', 'whatsapp', 'fake', '****0004', 'quote', 'sent')`, [ids.lead, ids.quote]);
    // Even an insert that claims the clinic is moved to the lead's business.
    await one(`INSERT INTO messages (crm_lead_id, kind, to_masked, template, business_id) VALUES ($1, 'crm_reminder', '****0004', 'reminder', 'lotus-clinic')`, [ids.lead]);
  }, 60_000);

  afterAll(async () => {
    await db?.close();
  });

  it("covers every table in the database, and every table has a NOT NULL business_id with its default and an index", async () => {
    const { rows: tables } = await db.query<{ t: string }>(`SELECT tablename AS t FROM pg_tables WHERE schemaname = 'public' ORDER BY 1`);
    expect(tables.map((r) => r.t)).toEqual([...TABLES].sort());
    for (const t of TABLES) {
      const { rows } = await db.query<{ is_nullable: string; column_default: string }>(
        `SELECT is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'business_id'`,
        [t],
      );
      expect(rows, t).toEqual([{ is_nullable: "NO", column_default: `'${BOT_TABLES[t]}'::text` }]);
      const { rows: idx } = await db.query(`SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = $1 AND indexname = $2`, [t, `${t}_business_idx`]);
      expect(idx, t).toHaveLength(1);
    }
  });

  it("turns RLS on for every table without FORCE, with one SELECT-only policy for ogi_bot", async () => {
    const { rows } = await db.query<{ t: string; rls: boolean; force: boolean }>(
      `SELECT relname AS t, relrowsecurity AS rls, relforcerowsecurity AS force FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' ORDER BY 1`,
    );
    expect(rows).toEqual([...TABLES].sort().map((t) => ({ t, rls: true, force: false })));
    const { rows: policies } = await db.query<{ t: string; name: string; cmd: string; roles: string; qual: string }>(
      `SELECT tablename AS t, policyname AS name, cmd, roles::text AS roles, qual FROM pg_policies WHERE schemaname = 'public' ORDER BY 1`,
    );
    expect(policies).toHaveLength(TABLES.length);
    for (const p of policies) {
      expect(p).toMatchObject({ name: "ogi_bot_read", cmd: "SELECT", roles: "{ogi_bot}" });
      expect(p.qual).toContain("current_setting('app.business_id'::text, true)");
    }
  });

  it("makes ogi_bot a role nobody can log in as, with no special powers", async () => {
    const { rows } = await db.query(`SELECT rolcanlogin, rolsuper, rolbypassrls, rolcreaterole, rolcreatedb FROM pg_roles WHERE rolname = 'ogi_bot'`);
    expect(rows).toEqual([{ rolcanlogin: false, rolsuper: false, rolbypassrls: false, rolcreaterole: false, rolcreatedb: false }]);
  });

  it("gives ogi_bot SELECT and no write privilege on any table", async () => {
    for (const t of TABLES) {
      const { rows } = await db.query<Record<string, boolean>>(
        `SELECT has_table_privilege('ogi_bot', $1, 'SELECT') AS sel, has_table_privilege('ogi_bot', $1, 'INSERT') AS ins,
           has_table_privilege('ogi_bot', $1, 'UPDATE') AS upd, has_table_privilege('ogi_bot', $1, 'DELETE') AS del,
           has_table_privilege('ogi_bot', $1, 'TRUNCATE') AS trunc, has_table_privilege('ogi_bot', $1, 'REFERENCES') AS refs,
           has_table_privilege('ogi_bot', $1, 'TRIGGER') AS trig`,
        [t],
      );
      expect(rows[0], t).toEqual({ sel: true, ins: false, upd: false, del: false, trunc: false, refs: false, trig: false });
    }
  });

  it("attack: the bot for lotus-clinic sees zero CRM rows, and only clinic messages", async () => {
    for (const t of CRM_TABLES) expect(await count(db, "lotus-clinic", t), t).toBe(0);
    for (const t of CLINIC_TABLES) expect(await count(db, "lotus-clinic", t), t).toBeGreaterThan(0);
    const msgs = await botRead(db, "lotus-clinic", `SELECT kind, booking_id, crm_lead_id FROM messages`);
    expect(msgs).toEqual([{ kind: "confirmation", booking_id: ids.booking, crm_lead_id: null }]);
  });

  it("attack: the bot for kalyani-tiles sees zero clinic rows, and gets the CRM messages the clinic default would have mislabelled", async () => {
    for (const t of CLINIC_TABLES.filter((t) => t !== "messages")) expect(await count(db, "kalyani-tiles", t), t).toBe(0);
    for (const t of CRM_TABLES) expect(await count(db, "kalyani-tiles", t), t).toBeGreaterThan(0);
    const msgs = await botRead(db, "kalyani-tiles", `SELECT kind FROM messages ORDER BY kind`);
    expect(msgs.map((m) => m.kind)).toEqual(["crm_reminder", "quote_sent"]);
  });

  it("attack: a bot query that asks for another business by WHERE still gets nothing", async () => {
    expect(await botRead(db, "lotus-clinic", `SELECT id FROM crm_leads WHERE business_id = 'kalyani-tiles' OR true`)).toEqual([]);
    expect(await botRead(db, "lotus-clinic", `SELECT id FROM crm_leads WHERE id = $1`, [ids.lead])).toEqual([]);
  });

  it("attack: ogi_bot with no business set, an empty one, or an unknown one sees zero rows of every table", async () => {
    for (const t of TABLES) {
      expect(await rawBot(db, [], `SELECT * FROM ${t}`), `${t} unset`).toEqual([]);
      expect(await rawBot(db, [`SELECT set_config('app.business_id', '', true)`], `SELECT * FROM ${t}`), `${t} empty`).toEqual([]);
      expect(await rawBot(db, [`SELECT set_config('app.business_id', 'not-a-business', true)`], `SELECT * FROM ${t}`), `${t} unknown`).toEqual([]);
    }
  });

  it("attack: ogi_bot cannot INSERT, UPDATE, DELETE or TRUNCATE any table, even in a read-write transaction with its own business set", async () => {
    for (const t of TABLES) {
      const business = BOT_TABLES[t];
      const setup = [`SELECT set_config('app.business_id', '${business}', true)`];
      for (const write of [
        `INSERT INTO ${t} (business_id) VALUES ('${business}')`,
        `UPDATE ${t} SET business_id = business_id`,
        `DELETE FROM ${t}`,
        `TRUNCATE ${t} CASCADE`,
      ]) {
        await expect(rawBot(db, setup, write, { readOnly: false }), `${t}: ${write}`).rejects.toThrow(/permission denied/);
      }
    }
  });

  it("leaves no role or business behind after a bot read", async () => {
    await botRead(db, "lotus-clinic", `SELECT 1 AS one`);
    const { rows } = await db.query(`SELECT current_user AS who, current_setting('app.business_id', true) AS business`);
    expect(rows).toEqual([{ who: "app_owner", business: "" }]);
  });

  it("rejects an unknown business before any SQL exists", () => {
    expect(() => businessId("other-clinic")).toThrow(UnknownBusinessError);
  });

  it("keeps the app (the table owner) reading and writing every row as before", async () => {
    for (const t of TABLES) {
      const { rows } = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${t}`);
      expect(rows[0].n, t).toBeGreaterThan(0);
    }
    await db.query(`UPDATE bookings SET notes = 'seen' WHERE id = $1`, [ids.booking]);
    const { rows } = await db.query(`SELECT notes, business_id FROM bookings WHERE id = $1`, [ids.booking]);
    expect(rows).toEqual([{ notes: "seen", business_id: "lotus-clinic" }]);
  });

  it("moves CRM messages logged before the trigger to the lead's business when the schema reruns", async () => {
    await db.query(`ALTER TABLE messages DISABLE TRIGGER messages_business_id`);
    await db.query(`INSERT INTO messages (crm_lead_id, kind, to_masked, template) VALUES ($1, 'quote_sent', '****0004', 'old_send')`, [ids.lead]);
    await db.query(`ALTER TABLE messages ENABLE TRIGGER messages_business_id`);
    const before = await db.query(`SELECT business_id FROM messages WHERE template = 'old_send'`);
    expect(before.rows).toEqual([{ business_id: "lotus-clinic" }]);
    await migrate(db);
    const after = await db.query(`SELECT business_id FROM messages WHERE template = 'old_send'`);
    expect(after.rows).toEqual([{ business_id: "kalyani-tiles" }]);
  });
});

describe("migration guard", () => {
  it("stops before turning RLS on when the app's role does not own a table", async () => {
    const db = await freshDb();
    try {
      // Up to the role grant: tables, columns and ogi_bot exist, RLS not on yet.
      const rlsAt = statements.findIndex((s) => s.includes("ENABLE ROW LEVEL SECURITY"));
      for (const s of statements.slice(0, rlsAt)) await db.query(s);
      await db.exec(`RESET ROLE; CREATE ROLE someone_else NOLOGIN; ALTER TABLE whatsapp_unreachable OWNER TO someone_else; SET ROLE app_owner;`);
      await expect(db.query(statements[rlsAt])).rejects.toThrow(/whatsapp_unreachable is not owned by app_owner/);
      const { rows } = await db.query(`SELECT count(*)::int AS n FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relrowsecurity`);
      expect(rows).toEqual([{ n: 0 }]);
    } finally {
      await db.close();
    }
  }, 60_000);
});
