import { generateDemoEnquiries } from "./demoSeed";
import { memoryEnquiryStore, seedMemoryEnquiriesOnce } from "./memory";
import { neonQuery, postgresEnquiryStore } from "./postgres";
import { CAFE_SLUG, type EnquiryStore } from "./types";
import { indiaToday } from "./validation";

export * from "./types";

let cached: { url: string; store: EnquiryStore } | undefined;

/**
 * Postgres when DATABASE_URL is set, otherwise the in-memory store (dev and tests), which fills itself with the
 * demo seed on first use, as the clinic's store does. Postgres gets the seed from `npm run db:seed-cafe-demo`.
 * Server code only.
 */
export function getEnquiryStore(): EnquiryStore {
  const url = process.env.DATABASE_URL;
  if (!url) {
    seedMemoryEnquiriesOnce(CAFE_SLUG, () => generateDemoEnquiries(indiaToday()));
    return memoryEnquiryStore;
  }
  if (cached?.url !== url) cached = { url, store: postgresEnquiryStore(neonQuery(url)) };
  return cached.store;
}
