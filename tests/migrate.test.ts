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
    ]);
    expect(statements.every((s) => /IF NOT EXISTS/.test(s) && !s.includes(";"))).toBe(true);
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
});
