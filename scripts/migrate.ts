/**
 * Creates the bookings, messages, patient_notes, whatsapp_optouts, whatsapp_unreachable, crm_*, cafe_event_enquiries and cafe_orders tables, their indexes and
 * later columns, from lib/bookings/schema.sql. Also the organizations table (three seeded rows), org_id on every table
 * (filled by the database's own triggers), the read-only ogi_bot role (no login), and row-level security.
 * Safe to run more than once: statements are IF NOT EXISTS, CREATE OR REPLACE, ON CONFLICT DO NOTHING, SET NOT NULL,
 * DO blocks that check first, or grants; the backfills (view tokens, consent on old website bookings, org_id) only
 * touch rows still unset or wrong. Stops at SET NOT NULL if a row's slug matches no organization, and before RLS if
 * this role does not own every table.
 * Usage: npm run db:migrate   (reads DATABASE_URL from the shell or .env.local)
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { schemaStatements } from "../lib/bookings/migrations";

// Values already in the shell win over .env.local.
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // No such file. Fine.
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local or the shell, then run again.");
  process.exit(1);
}

const sql = neon(url);
const file = path.join(process.cwd(), "lib/bookings/schema.sql");
const statements = schemaStatements(readFileSync(file, "utf8"));

async function main() {
  for (const statement of statements) {
    await sql.query(statement);
    console.log(`ok: ${statement.split("\n")[0]}`);
  }
  for (const table of ["organizations", "bookings","messages", "patient_notes", "whatsapp_optouts", "whatsapp_unreachable", "crm_products", "crm_leads", "crm_quotes", "crm_quote_items", "crm_followups", "cafe_event_enquiries", "cafe_orders"]) {
    const [{ count }] = (await sql.query(`SELECT count(*)::int AS count FROM ${table}`)) as { count: number }[];
    console.log(`${table} table ready, ${count} rows`);
  }
}

main().catch((err: unknown) => {
  console.error("migrate failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
