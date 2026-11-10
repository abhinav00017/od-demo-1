import { clinicToday } from "./clinicDay";
import { generateDemoData } from "./demoSeed";
import { memoryStore, seedMemoryDemoOnce } from "./memory";
import { postgresStore } from "./postgres";
import type { BookingStore } from "./types";

export * from "./types";

let cached: { url: string; store: BookingStore } | undefined;

/** The demo clinic every booking belongs to. */
export const CLINIC_SLUG = "lotus-clinic";

/**
 * Postgres when DATABASE_URL is set, otherwise the in-memory store, which fills itself with the demo
 * clinic's sample data on first use. Postgres gets the sample data from `npm run db:seed-clinic-demo`.
 */
export function getStore(): BookingStore {
  const url = process.env.DATABASE_URL;
  if (!url) {
    seedMemoryDemoOnce(CLINIC_SLUG, () => generateDemoData(clinicToday()));
    return memoryStore;
  }
  if (cached?.url !== url) cached = { url, store: postgresStore(url) };
  return cached.store;
}

export { clinicToday, clinicTomorrow } from "./clinicDay";
export { isDemoPhone, DEMO_PHONE_PREFIX } from "./demoPhones";
