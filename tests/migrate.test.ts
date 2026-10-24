// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { schemaStatements } from "@/lib/bookings/migrations";

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
      "ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_kind_check, ADD CONSTRAINT messages_kind_check CHECK (kind IN ('confirmation', 'reminder', 'cancellation', 'clinic_alert', 'inbound', 'patient_confirmed', 'quote_sent', 'crm_reminder'))",
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
    ]);
    expect(statements.every((s) => /IF (NOT )?EXISTS/.test(s) && !s.includes(";"))).toBe(true);
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
});
