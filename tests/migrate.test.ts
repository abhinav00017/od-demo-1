// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { schemaStatements } from "@/lib/bookings/migrations";
import { BOT_TABLES, type BotTable } from "@/lib/db/botScope";

const TABLES = Object.keys(BOT_TABLES) as BotTable[];

describe("schema.sql", () => {
  const statements = schemaStatements(readFileSync(path.join(process.cwd(), "lib/bookings/schema.sql"), "utf8"));

  it("splits into one statement per call, all safe to rerun", () => {
    expect(statements.map((s) => s.split("\n")[0])).toEqual([
      "CREATE TABLE IF NOT EXISTS bookings (",
      "CREATE INDEX IF NOT EXISTS bookings_clinic_date_idx ON bookings (clinic_slug, date)",
      "CREATE TABLE IF NOT EXISTS messages (",
      "CREATE INDEX IF NOT EXISTS messages_booking_idx ON messages (booking_id, created_at)",
      "CREATE UNIQUE INDEX IF NOT EXISTS messages_provider_id_idx ON messages (provider_message_id) WHERE provider_message_id IS NOT NULL",
      "ALTER TABLE messages ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'meta' CHECK (provider IN ('meta', 'twilio', 'fake'))",
      "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS wants_new_time boolean NOT NULL DEFAULT false",
      "ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_kind_check, ADD CONSTRAINT messages_kind_check CHECK (kind IN ('confirmation', 'reminder', 'cancellation', 'clinic_alert', 'inbound', 'patient_confirmed', 'quote_sent', 'crm_reminder', 'request_received', 'visit_moved'))",
      "CREATE TABLE IF NOT EXISTS crm_products (",
      "CREATE TABLE IF NOT EXISTS crm_leads (",
      "CREATE TABLE IF NOT EXISTS crm_quotes (",
      "CREATE INDEX IF NOT EXISTS crm_quotes_lead_idx ON crm_quotes (lead_id, created_at)",
      "CREATE TABLE IF NOT EXISTS crm_quote_items (",
      "CREATE INDEX IF NOT EXISTS crm_quote_items_quote_idx ON crm_quote_items (quote_id, position)",
      "CREATE TABLE IF NOT EXISTS crm_followups (",
      "CREATE INDEX IF NOT EXISTS crm_followups_shop_open_idx ON crm_followups (shop_slug, due_at) WHERE done_at IS NULL",
      "CREATE INDEX IF NOT EXISTS crm_followups_lead_idx ON crm_followups (lead_id, created_at)",
      "ALTER TABLE IF EXISTS messages ALTER COLUMN booking_id DROP NOT NULL",
      "ALTER TABLE messages ADD COLUMN IF NOT EXISTS crm_lead_id uuid REFERENCES crm_leads (id) ON DELETE CASCADE",
      "ALTER TABLE messages ADD COLUMN IF NOT EXISTS crm_quote_id uuid REFERENCES crm_quotes (id) ON DELETE SET NULL",
      "CREATE INDEX IF NOT EXISTS messages_crm_lead_idx ON messages (crm_lead_id, created_at) WHERE crm_lead_id IS NOT NULL",
      "ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_owner_check, ADD CONSTRAINT messages_owner_check CHECK (booking_id IS NOT NULL OR crm_lead_id IS NOT NULL)",
      "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'website' CHECK (source IN ('website', 'google_ads', 'meta_ads', 'google_maps', 'google_search', 'walk_in', 'phone', 'referral', 'whatsapp', 'other'))",
      "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS campaign text",
      "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS utm jsonb",
      "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false",
      "ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check, ADD CONSTRAINT bookings_status_check CHECK (status IN ('new', 'confirmed', 'cancelled', 'visited', 'no_show'))",
      "CREATE INDEX IF NOT EXISTS bookings_clinic_phone_idx ON bookings (clinic_slug, phone)",
      "CREATE TABLE IF NOT EXISTS patient_notes (",
      "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS view_token text",
      "UPDATE bookings SET view_token = translate(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') WHERE view_token IS NULL",
      "CREATE UNIQUE INDEX IF NOT EXISTS bookings_view_token_idx ON bookings (view_token) WHERE view_token IS NOT NULL",
      "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS awaiting_patient boolean NOT NULL DEFAULT false",
      "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS no_whatsapp boolean NOT NULL DEFAULT false",
      "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS phone_confirmed_at timestamptz",
      "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS requested_date date",
      "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS requested_slot text",
      "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS consent_at timestamptz",
      "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS consent_text text",
      "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS consent_source text CHECK (consent_source IN ('website', 'staff'))",
      "UPDATE bookings SET consent_at = created_at, consent_text = 'The clinic may message me on WhatsApp about this visit.', consent_source = 'website'",
      "CREATE TABLE IF NOT EXISTS whatsapp_optouts (",
      "CREATE TABLE IF NOT EXISTS whatsapp_unreachable (",
      ...TABLES.map((t) => `ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS business_id text NOT NULL DEFAULT '${BOT_TABLES[t]}'`),
      ...TABLES.map((t) => `CREATE INDEX IF NOT EXISTS ${t}_business_idx ON ${t} (business_id)`),
      "CREATE OR REPLACE FUNCTION messages_business_id() RETURNS trigger LANGUAGE plpgsql AS $$",
      "CREATE OR REPLACE TRIGGER messages_business_id BEFORE INSERT OR UPDATE OF booking_id, crm_lead_id, business_id ON messages",
      "UPDATE messages SET business_id = crm_leads.business_id FROM crm_leads",
      "DO $$",
      "GRANT ogi_bot TO CURRENT_USER",
      "DO $$",
    ]);
    // Every statement is safe to rerun: IF [NOT] EXISTS, CREATE OR REPLACE, a DO block that checks first, a GRANT
    // (granting twice is a no-op), or an UPDATE that only touches rows still unset or still wrong.
    // Only dollar-quoted bodies (DO blocks, functions) may hold a semicolon.
    const rerunSafe = (s: string) =>
      /IF (NOT )?EXISTS/.test(s) ||
      s.startsWith("CREATE OR REPLACE ") ||
      s.startsWith("DO $$") ||
      s.startsWith("GRANT ") ||
      (s.startsWith("UPDATE ") && /IS NULL|IS DISTINCT FROM/.test(s));
    expect(statements.filter((s) => !rerunSafe(s))).toEqual([]);
    expect(statements.filter((s) => s.includes(";") && !s.includes("$$"))).toEqual([]);
  });

  it("backfills tokens and consent only where unset, and consent only on old website rows", () => {
    const consent = statements.find((s) => s.startsWith("UPDATE bookings SET consent_at"))!;
    expect(consent).toContain("consent_source IS NULL");
    expect(consent).toContain("is_demo = false");
    // Rows the app creates have 24-character tokens, so a rerun never gives consent to a later staff booking.
    expect(consent).toContain("length(view_token) = 64");
    expect(consent).not.toMatch(/'walk_in'|'phone'|'referral'/);
    expect(statements.indexOf(consent)).toBeGreaterThan(statements.findIndex((s) => s.startsWith("UPDATE bookings SET view_token")));
    const optouts = statements.find((s) => s.startsWith("CREATE TABLE IF NOT EXISTS whatsapp_optouts"))!;
    expect(optouts).toMatch(/phone\s+text\s+PRIMARY KEY/);
    expect(optouts).toMatch(/opted_out_at\s+timestamptz NOT NULL DEFAULT now\(\)/);
    expect(optouts).toMatch(/source\s+text/);
  });

  it("creates the messages table with the agreed columns and checks", () => {
    const messages = statements[2];
    for (const col of ["booking_id", "kind", "channel", "to_masked", "template", "provider_message_id", "status", "error", "created_at", "updated_at"]) {
      expect(messages).toMatch(new RegExp(`\\n\\s+${col}\\s`));
    }
    expect(messages).toContain("REFERENCES bookings (id)");
    expect(messages).toContain("'queued', 'sent', 'delivered', 'read', 'failed'");
    expect(messages).toContain("'confirmation', 'reminder', 'cancellation', 'clinic_alert'");
  });

  it("adds the provider column to existing tables, defaulting old rows to meta", () => {
    const alter = statements.find((s) => s.startsWith("ALTER TABLE messages ADD COLUMN"));
    expect(alter).toMatch(/ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'meta'/);
    expect(alter).toContain("'meta', 'twilio', 'fake'");
    // After the CREATE TABLE, so a fresh database gets the column too.
    expect(statements.indexOf(alter!)).toBeGreaterThan(statements.findIndex((s) => s.startsWith("CREATE TABLE IF NOT EXISTS messages")));
  });

  it("adds wants_new_time and the inbound kinds, after the tables exist", () => {
    const flag = statements.find((s) => s.includes("wants_new_time"));
    expect(flag).toBe("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS wants_new_time boolean NOT NULL DEFAULT false");
    const kinds = statements.find((s) => s.includes("messages_kind_check"))!;
    // Drop and add in one statement, so a rerun never leaves the table without a check.
    expect(kinds).toMatch(/^ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_kind_check, ADD CONSTRAINT messages_kind_check CHECK/);
    expect(kinds).toContain("'inbound', 'patient_confirmed'");
    expect(statements[2]).toContain("'clinic_alert', 'inbound', 'patient_confirmed'");
  });

  it("widens the kind check for the CRM in the same statement, so a rerun never narrows it over CRM rows", () => {
    const checks = statements.filter((s) => s.includes("ADD CONSTRAINT messages_kind_check"));
    expect(checks).toHaveLength(1);
    expect(checks[0]).toContain("'quote_sent', 'crm_reminder'");
  });

  it("creates the CRM tables with shop_slug, money in paise and the agreed checks", () => {
    const table = (name: string) => statements.find((s) => s.startsWith(`CREATE TABLE IF NOT EXISTS ${name} (`))!;
    for (const name of ["crm_products", "crm_leads", "crm_quotes", "crm_followups"]) expect(table(name)).toMatch(/\n\s+shop_slug\s+text\s+NOT NULL DEFAULT 'kalyani-tiles'/);
    expect(table("crm_products")).toContain("UNIQUE (shop_slug, sku)");
    expect(table("crm_products")).toContain("'floor', 'wall', 'outdoor', 'bathroom', 'kitchen'");
    expect(table("crm_leads")).toContain("UNIQUE (shop_slug, phone)");
    expect(table("crm_leads")).toContain("'lead', 'customer', 'lost'");
    expect(table("crm_quotes")).toContain("UNIQUE (shop_slug, number)");
    expect(table("crm_quotes")).toContain("'draft', 'sent', 'sold', 'lost'");
    expect(table("crm_quote_items")).toMatch(/wastage_pct\s+numeric\(5, 2\) NOT NULL DEFAULT 10/);
    expect(table("crm_followups")).toContain("'auto_whatsapp', 'call'");
    // CRM tables come before the messages columns that point at them.
    const leadsAt = statements.indexOf(table("crm_leads"));
    expect(statements.findIndex((s) => s.includes("ADD COLUMN IF NOT EXISTS crm_lead_id"))).toBeGreaterThan(leadsAt);
  });

  it("keeps each DO block and function body whole, so Neon gets it as one statement", () => {
    const bodies = statements.filter((s) => s.includes("$$"));
    expect(bodies).toHaveLength(3);
    for (const b of bodies) {
      expect(b.match(/\$\$/g)).toHaveLength(2);
      expect(b.endsWith("$$")).toBe(true);
    }
    expect(schemaStatements("DO $$\nBEGIN\n  PERFORM 1;\n  -- kept inside the body\nEND\n$$;\n-- dropped\nSELECT 2;")).toEqual([
      "DO $$\nBEGIN\n  PERFORM 1;\n  -- kept inside the body\nEND\n$$",
      "SELECT 2",
    ]);
  });

  it("gives every table a business_id the Ogi helper knows, and RLS for ogi_bot on all of them", () => {
    const created = statements.filter((s) => s.startsWith("CREATE TABLE IF NOT EXISTS")).map((s) => s.split(" ")[5]);
    expect([...created].sort()).toEqual([...TABLES].sort());
    const rls = statements.find((s) => s.includes("ENABLE ROW LEVEL SECURITY"))!;
    for (const t of TABLES) expect(rls).toContain(`'${t}'`);
    expect(rls).not.toMatch(/ALTER TABLE %I FORCE/);
    expect(rls).toContain("FOR SELECT TO ogi_bot USING (business_id = NULLIF(current_setting(%L, true), %L))");
    expect(rls).toContain("GRANT SELECT ON %I TO ogi_bot");
    // No login role and no password anywhere in the schema.
    expect(statements.join("\n")).not.toMatch(/\bLOGIN\b(?<!NOLOGIN)|PASSWORD/i);
  });
});
