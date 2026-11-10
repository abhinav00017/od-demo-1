/**
 * Replaces the Lotus clinic's demo data in Postgres with fresh sample data for today (India time):
 * deletes is_demo bookings (their messages go with them) and the notes on demo phones (90000 2xxxx),
 * then inserts about 45 bookings, a few WhatsApp log rows and notes, all is_demo. Real bookings are never touched.
 * Run `npm run db:migrate` first. Usage: npm run db:seed-clinic-demo   (reads DATABASE_URL from the shell or .env.local)
 */
import { clinicToday } from "../lib/bookings/clinicDay";
import { generateDemoData } from "../lib/bookings/demoSeed";
import { postgresStore } from "../lib/bookings/postgres";

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

const CLINIC_SLUG = "lotus-clinic";

async function main() {
  const today = clinicToday();
  const data = generateDemoData(today);
  const result = await postgresStore(url!).replaceDemoData(CLINIC_SLUG, data);
  console.log(`${CLINIC_SLUG}: ${result.deleted} old demo bookings removed; ${result.inserted} bookings, ${data.messages.length} messages, ${data.notes.length} notes added for ${today}`);
}

main().catch((err: unknown) => {
  console.error("seed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
