import type { Query } from "@/lib/cafeEvents/postgres";
import { orderReferenceOf, sumQty, sumTotal, type Order, type OrderStore } from "./types";

type Stamp = Date | string;

// org_id is filled by the database from cafe_slug (schema.sql), so it is never written here.
export const ORDER_COLUMNS = `id, created_at, cafe_slug, channel, items, item_count, total, fulfilment, name, phone, source, is_demo`;

export type OrderRow = {
  id: string;
  created_at: Stamp;
  cafe_slug: string;
  channel: Order["channel"];
  items: Order["items"] | string;
  item_count: number | string;
  total: number | string;
  fulfilment: Order["fulfilment"];
  name: string | null;
  phone: string | null;
  source: Order["source"];
  is_demo: boolean;
};

export const toOrder = (r: OrderRow): Order => ({
  id: r.id,
  reference: orderReferenceOf(r.id),
  createdAt: new Date(r.created_at).toISOString(),
  cafeSlug: r.cafe_slug,
  channel: r.channel,
  // Drivers hand jsonb back parsed; a string means a driver that did not.
  items: typeof r.items === "string" ? (JSON.parse(r.items) as Order["items"]) : r.items,
  itemCount: Number(r.item_count),
  total: Number(r.total),
  fulfilment: r.fulfilment,
  name: r.name,
  phone: r.phone,
  source: r.source,
  isDemo: r.is_demo,
});

/** A demo never needs more than this many orders in one read (about 60 days of sample orders is under 3,000). */
export const ORDER_LIST_LIMIT = 10_000;

/** Orders in Postgres (the cafe_orders table). Every read and write names the cafe. */
export function postgresOrderStore(query: Query): OrderStore {
  const rows = async (text: string, params: unknown[]) => (await query(text, params)) as unknown as OrderRow[];
  return {
    kind: "postgres",

    async create(o) {
      const [row] = await rows(
        `INSERT INTO cafe_orders (cafe_slug, channel, items, item_count, total, fulfilment, name, phone, source)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9) RETURNING ${ORDER_COLUMNS}`,
        [o.cafeSlug, o.channel, JSON.stringify(o.items), sumQty(o.items), sumTotal(o.items), o.fulfilment, o.name, o.phone, o.source],
      );
      return toOrder(row);
    },

    async list(cafeSlug, fromIso) {
      const list = await rows(
        `SELECT ${ORDER_COLUMNS} FROM cafe_orders WHERE cafe_slug = $1 AND created_at >= $2 ORDER BY created_at DESC LIMIT ${ORDER_LIST_LIMIT}`,
        [cafeSlug, fromIso ?? "1970-01-01T00:00:00Z"],
      );
      return list.map(toOrder);
    },

    // One statement, so the delete and the inserts happen together: Neon's HTTP driver runs one statement per call.
    async replaceDemo(cafeSlug, demo) {
      const payload = demo.map((d) => ({
        created_at: d.createdAt,
        channel: d.channel,
        items: d.items,
        item_count: sumQty(d.items),
        total: sumTotal(d.items),
        fulfilment: d.fulfilment,
        name: d.name,
        phone: d.phone,
        source: d.source,
      }));
      const [result] = (await query(
        `WITH gone AS (
           DELETE FROM cafe_orders WHERE cafe_slug = $1 AND is_demo RETURNING 1
         ), added AS (
           INSERT INTO cafe_orders (cafe_slug, created_at, channel, items, item_count, total, fulfilment, name, phone, source, is_demo)
           SELECT $1, x.created_at, x.channel, x.items, x.item_count, x.total, x.fulfilment, x.name, x.phone, x.source, true
           FROM jsonb_to_recordset($2::jsonb) AS x(created_at timestamptz, channel text, items jsonb, item_count integer, total integer,
             fulfilment text, name text, phone text, source text)
           RETURNING 1
         )
         SELECT (SELECT count(*) FROM gone)::int AS deleted, (SELECT count(*) FROM added)::int AS inserted`,
        [cafeSlug, JSON.stringify(payload)],
      )) as { deleted: number; inserted: number }[];
      return { deleted: Number(result.deleted), inserted: Number(result.inserted) };
    },
  };
}
