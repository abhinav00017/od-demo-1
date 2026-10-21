/**
 * Creates the bookings table. Safe to run more than once (IF NOT EXISTS).
 * Usage: npm run db:migrate   (reads DATABASE_URL from the shell or .env.local)
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

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
// The HTTP driver runs one statement per call, so split on the semicolons that end a line.
const statements = readFileSync(file, "utf8")
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .split(/;\s*$/m)
  .map((s) => s.trim())
  .filter(Boolean);

async function main() {
  for (const statement of statements) {
    await sql.query(statement);
    console.log(`ok: ${statement.split("\n")[0]}`);
  }
  const [{ count }] = (await sql.query("SELECT count(*)::int AS count FROM bookings")) as { count: number }[];
  console.log(`bookings table ready, ${count} rows`);
}

main().catch((err: unknown) => {
  console.error("migrate failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
