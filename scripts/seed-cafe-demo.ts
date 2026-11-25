/**
 * Replaces the Solstice cafe's demo event enquiries in Postgres with fresh sample data for today (India time):
 * deletes is_demo enquiries for solstice-cafe, then inserts 22 made-up ones (lib/cafeEvents/demoSeed.ts), all is_demo.
 * Then the same for sample orders: deletes is_demo orders for solstice-cafe and inserts about 60 days of made-up ones
 * (lib/cafeOrders/demoSeed.ts), all is_demo. Real enquiries and real orders are never touched. Run `npm run db:migrate` first.
 * Run it only against the demo database: it writes sample rows.
 * Usage: npm run db:seed-cafe-demo   (reads DATABASE_URL from the shell or .env.local)
 */
import { generateDemoEnquiries } from "../lib/cafeEvents/demoSeed";
import { generateDemoOrders } from "../lib/cafeOrders/demoSeed";
import { postgresOrderStore } from "../lib/cafeOrders/postgres";
import { neonQuery, postgresEnquiryStore } from "../lib/cafeEvents/postgres";
import { CAFE_SLUG } from "../lib/cafeEvents/types";
import { indiaToday } from "../lib/cafeEvents/validation";

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

async function main() {
  const today = indiaToday();
  const rows = generateDemoEnquiries(today);
  const result = await postgresEnquiryStore(neonQuery(url!)).replaceDemo(CAFE_SLUG, rows);
  console.log(`${CAFE_SLUG}: ${result.deleted} old demo enquiries removed; ${result.inserted} added for ${today}`);
  const orders = await postgresOrderStore(neonQuery(url!)).replaceDemo(CAFE_SLUG, generateDemoOrders(today));
  console.log(`${CAFE_SLUG}: ${orders.deleted} old demo orders removed; ${orders.inserted} added for ${today}`);
}

main().catch((err: unknown) => {
  console.error("seed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
