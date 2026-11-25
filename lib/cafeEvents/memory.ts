import { randomUUID } from "node:crypto";
import { orgForSlug } from "@/lib/orgs";
import { referenceOf, type DemoEnquiry, type Enquiry, type EnquiryStore } from "./types";

// Kept on globalThis so every route in one server process shares the same list.
// In `next dev` each route can load its own copy of this module.
const g = globalThis as typeof globalThis & { __cafeEnquiries?: Enquiry[]; __cafeDemoSeeded?: boolean };

function rows(): Enquiry[] {
  g.__cafeEnquiries ??= [];
  return g.__cafeEnquiries;
}

const copy = (e: Enquiry): Enquiry => ({ ...e, utm: e.utm ? { ...e.utm } : null });

function needOrg(cafeSlug: string) {
  if (!orgForSlug(cafeSlug)) throw new Error("no organization has this cafe_event_enquiries.cafe_slug");
}

function replaceDemo(cafeSlug: string, demo: DemoEnquiry[]) {
  needOrg(cafeSlug);
  const before = rows().length;
  g.__cafeEnquiries = rows().filter((e) => !(e.isDemo && e.cafeSlug === cafeSlug));
  const deleted = before - rows().length;
  for (const d of demo) {
    const id = randomUUID();
    rows().push({ ...d, cafeSlug, id, reference: referenceOf(id), isDemo: true });
  }
  return { deleted, inserted: demo.length };
}

/**
 * Enquiries in server memory, for `next dev` and tests without DATABASE_URL. Gone on restart.
 * Like the database's org_id trigger, it refuses a cafe slug that matches no organization.
 */
export const memoryEnquiryStore: EnquiryStore = {
  kind: "memory",

  async create(input) {
    needOrg(input.cafeSlug);
    const id = randomUUID();
    const row: Enquiry = { ...input, id, reference: referenceOf(id), createdAt: new Date().toISOString(), status: "new", statusUpdatedAt: null, isDemo: false };
    rows().push(row);
    return copy(row);
  },

  async list(cafeSlug) {
    return rows()
      .filter((e) => e.cafeSlug === cafeSlug)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(copy);
  },

  async setStatus(cafeSlug, id, status) {
    const row = rows().find((e) => e.cafeSlug === cafeSlug && e.id === id);
    if (!row) return undefined;
    row.status = status;
    row.statusUpdatedAt = new Date().toISOString();
    return copy(row);
  },

  async replaceDemo(cafeSlug, demo) {
    return replaceDemo(cafeSlug, demo);
  },
};

/** Fills the memory store with the demo seed the first time anything asks for it, as the clinic's store does. */
export function seedMemoryEnquiriesOnce(cafeSlug: string, build: () => DemoEnquiry[]) {
  if (g.__cafeDemoSeeded) return;
  g.__cafeDemoSeeded = true;
  replaceDemo(cafeSlug, build());
}

/** Tests only: empties the list. `seed: true` lets the next getEnquiryStore() seed the demo data again. */
export function resetMemoryEnquiries({ seed = false }: { seed?: boolean } = {}) {
  g.__cafeEnquiries = [];
  g.__cafeDemoSeeded = !seed;
}

/** All rows, unfiltered and uncopied: only for the bot's memory path, which filters them by organization itself. */
export function allMemoryEnquiries(): readonly Enquiry[] {
  return rows();
}
