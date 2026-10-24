import { memoryCrmStore, seedMemoryOnce } from "./memory";
import { postgresCrmStore } from "./postgres";
import { seedCrm } from "./seed";
import { SHOPS } from "./shop";
import type { CrmStore } from "./types";

export * from "./types";

let cached: { url: string; store: CrmStore } | undefined;

/**
 * Postgres when DATABASE_URL is set, otherwise the in-memory store, which seeds the demo shop on first use
 * so the CRM has products, leads and quotes the moment someone logs in.
 */
export async function getCrmStore(): Promise<CrmStore> {
  const url = process.env.DATABASE_URL;
  if (url) {
    if (cached?.url !== url) cached = { url, store: postgresCrmStore(url) };
    return cached.store;
  }
  await seedMemoryOnce(async () => {
    for (const shop of SHOPS) await seedCrm(memoryCrmStore, shop);
  });
  return memoryCrmStore;
}
