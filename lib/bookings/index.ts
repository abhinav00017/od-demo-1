import { memoryStore } from "./memory";
import { postgresStore } from "./postgres";
import type { BookingStore } from "./types";

export * from "./types";

let cached: { url: string; store: BookingStore } | undefined;

/** Postgres when DATABASE_URL is set, otherwise the in-memory store. */
export function getStore(): BookingStore {
  const url = process.env.DATABASE_URL;
  if (!url) return memoryStore;
  if (cached?.url !== url) cached = { url, store: postgresStore(url) };
  return cached.store;
}

/** The demo clinic every booking belongs to. */
export const CLINIC_SLUG = "lotus-clinic";

export { clinicToday, clinicTomorrow } from "./clinicDay";
