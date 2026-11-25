import type { PublicSource } from "@/lib/bookings/sources";

/** The demo cafe every order belongs to. Its organization (lib/orgs.ts) is found from this slug, as for enquiries. */
export { CAFE_SLUG } from "@/lib/cafeEvents/types";

/** Where an order came in: the website's order tray, a WhatsApp chat, or the counter. */
export const ORDER_CHANNELS = ["website", "whatsapp", "walk_in"] as const;
export type OrderChannel = (typeof ORDER_CHANNELS)[number];

export const ORDER_CHANNEL_LABELS: Record<OrderChannel, string> = { website: "Website", whatsapp: "WhatsApp", walk_in: "Walk-in" };

/** Courtyard pickup or Jubilee Hills delivery, from the tray. Null for walk-ins and old rows. */
export const FULFILMENTS = ["pickup", "delivery"] as const;
export type Fulfilment = (typeof FULFILMENTS)[number];

/** One line of an order. The name and unit price are copied from the menu (demos/solstice-cafe/data.ts) by the server. */
export type OrderItem = { id: string; name: string; category: string; qty: number; unitPrice: number };

export type Order = {
  id: string;
  /** What the visitor sees in the WhatsApp message and the owner sees, like OR-1A2B3C4D. */
  reference: string;
  createdAt: string;
  cafeSlug: string;
  channel: OrderChannel;
  items: OrderItem[];
  /** Sum of qty. */
  itemCount: number;
  /** Rupees, incl. GST, worked out by the server from the menu. */
  total: number;
  fulfilment: Fulfilment | null;
  name: string | null;
  phone: string | null;
  source: PublicSource | null;
  isDemo: boolean;
};

export type NewOrder = Pick<Order, "cafeSlug" | "channel" | "items" | "fulfilment" | "name" | "phone" | "source">;

/** A sample order from the demo seed. */
export type DemoOrder = Omit<NewOrder, "cafeSlug"> & Pick<Order, "createdAt">;

export interface OrderStore {
  kind: "memory" | "postgres";
  create(input: NewOrder): Promise<Order>;
  /** This cafe's orders created at or after `fromIso` (all when omitted), newest first. */
  list(cafeSlug: string, fromIso?: string): Promise<Order[]>;
  /** Deletes this cafe's demo orders and inserts the given ones as demo rows. Real orders are never touched. */
  replaceDemo(cafeSlug: string, rows: DemoOrder[]): Promise<{ deleted: number; inserted: number }>;
}

/** The reference is the id's first 8 hex characters, so it needs no column of its own. */
export function orderReferenceOf(id: string) {
  return `OR-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export const sumQty = (items: readonly OrderItem[]) => items.reduce((n, i) => n + i.qty, 0);
export const sumTotal = (items: readonly OrderItem[]) => items.reduce((n, i) => n + i.qty * i.unitPrice, 0);
