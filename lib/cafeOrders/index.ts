import { neonQuery } from "@/lib/cafeEvents/postgres";
import { indiaToday } from "@/lib/cafeEvents/validation";
import { generateDemoOrders } from "./demoSeed";
import { memoryOrderStore, seedMemoryOrdersOnce } from "./memory";
import { postgresOrderStore } from "./postgres";
import { CAFE_SLUG, type OrderStore } from "./types";

export * from "./types";

let cached: { url: string; store: OrderStore } | undefined;

/**
 * Postgres when DATABASE_URL is set, otherwise the in-memory store (dev and tests), which fills itself with the demo
 * seed on first use. Postgres gets the seed from `npm run db:seed-cafe-demo`. Server code only.
 */
export function getOrderStore(): OrderStore {
  const url = process.env.DATABASE_URL;
  if (!url) {
    seedMemoryOrdersOnce(CAFE_SLUG, () => generateDemoOrders(indiaToday()));
    return memoryOrderStore;
  }
  if (cached?.url !== url) cached = { url, store: postgresOrderStore(neonQuery(url)) };
  return cached.store;
}
