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
      "ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_kind_check, ADD CONSTRAINT messages_kind_check CHECK (kind IN ('confirmation', 'reminder', 'cancellation', 'clinic_alert', 'inbound', 'patient_confirmed'))",
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
    const kinds = statements.at(-1)!;
    // Drop and add in one statement, so a rerun never leaves the table without a check.
    expect(kinds).toMatch(/^ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_kind_check, ADD CONSTRAINT messages_kind_check CHECK/);
    expect(kinds).toContain("'inbound', 'patient_confirmed'");
    expect(statements[2]).toContain("'clinic_alert', 'inbound', 'patient_confirmed'");
  });
});
