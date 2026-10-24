/**
 * Seeds the CRM demo shop (Kalyani Tiles & Sanitary) in Postgres: ~30 products, 6 leads, their quotes and follow-ups.
 * Safe to run more than once: existing SKUs are skipped, and a lead whose number is already there keeps its quotes.
 * Run `npm run db:migrate` first. Usage: npm run db:seed-crm   (reads DATABASE_URL from the shell or .env.local)
 */
import { postgresCrmStore } from "../lib/crm/postgres";
import { seedCrm } from "../lib/crm/seed";
import { SHOPS } from "../lib/crm/shop";

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
  const store = postgresCrmStore(url!);
  for (const shop of SHOPS) {
    const added = await seedCrm(store, shop);
    console.log(`${shop.slug}: ${added.products} products and ${added.leads} leads added`);
  }
}

main().catch((err: unknown) => {
  console.error("seed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
