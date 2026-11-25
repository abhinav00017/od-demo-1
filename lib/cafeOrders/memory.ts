import { randomUUID } from "node:crypto";
import { orgForSlug } from "@/lib/orgs";
import { orderReferenceOf, sumQty, sumTotal, type DemoOrder, type Order, type OrderStore } from "./types";

// On globalThis so every route in one server process shares the same list (next dev loads modules per route).
const g = globalThis as typeof globalThis & { __cafeOrders?: Order[]; __cafeOrdersSeeded?: boolean };

function rows(): Order[] {
  g.__cafeOrders ??= [];
  return g.__cafeOrders;
}

const copy = (o: Order): Order => ({ ...o, items: o.items.map((i) => ({ ...i })) });

function needOrg(cafeSlug: string) {
  if (!orgForSlug(cafeSlug)) throw new Error("no organization has this cafe_orders.cafe_slug");
}

function replaceDemo(cafeSlug: string, demo: DemoOrder[]) {
  needOrg(cafeSlug);
  const before = rows().length;
  g.__cafeOrders = rows().filter((o) => !(o.isDemo && o.cafeSlug === cafeSlug));
  const deleted = before - rows().length;
  for (const d of demo) {
    const id = randomUUID();
    rows().push({ ...d, cafeSlug, id, reference: orderReferenceOf(id), itemCount: sumQty(d.items), total: sumTotal(d.items), isDemo: true });
  }
  return { deleted, inserted: demo.length };
}

/** Orders in server memory, for `next dev` and tests without DATABASE_URL. Gone on restart. */
export const memoryOrderStore: OrderStore = {
  kind: "memory",

  async create(input) {
    needOrg(input.cafeSlug);
    const id = randomUUID();
    const row: Order = {
      ...input,
      id,
      reference: orderReferenceOf(id),
      createdAt: new Date().toISOString(),
      itemCount: sumQty(input.items),
      total: sumTotal(input.items),
      isDemo: false,
    };
    rows().push(row);
    return copy(row);
  },

  async list(cafeSlug, fromIso) {
    return rows()
      .filter((o) => o.cafeSlug === cafeSlug && (!fromIso || o.createdAt >= fromIso))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(copy);
  },

  async replaceDemo(cafeSlug, demo) {
    return replaceDemo(cafeSlug, demo);
  },
};

/** All rows, unfiltered and uncopied: only for the bot's memory path, which filters them by organization itself. */
export function allMemoryOrders(): readonly Order[] {
  return rows();
}

/** Fills the memory store with the demo seed the first time anything asks for it. */
export function seedMemoryOrdersOnce(cafeSlug: string, build: () => DemoOrder[]) {
  if (g.__cafeOrdersSeeded) return;
  g.__cafeOrdersSeeded = true;
  replaceDemo(cafeSlug, build());
}

/** Tests only: empties the list. `seed: true` lets the next getOrderStore() seed the demo data again. */
export function resetMemoryOrders({ seed = false }: { seed?: boolean } = {}) {
  g.__cafeOrders = [];
  g.__cafeOrdersSeeded = !seed;
}
