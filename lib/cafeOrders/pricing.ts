/**
 * The web order the tray sends, and its prices. The browser sends only menu ids and quantities. Every name, unit price
 * and the total come from the menu here on the server (demos/solstice-cafe/data.ts), so a price typed into the request
 * is never read: zod drops unknown fields.
 */
import { z } from "zod";
import { DELIVERY_OPTIONS, MENU_ITEMS } from "@/demos/solstice-cafe/data";
import { PUBLIC_SOURCES } from "@/lib/bookings/sources";
import type { Fulfilment, OrderItem } from "./types";

export const MAX_LINES = 20;
export const MAX_QTY = 20;

export const webOrderSchema = z.object({
  items: z
    .array(z.object({ id: z.string().max(60), qty: z.number().int().min(1).max(MAX_QTY) }))
    .min(1, "Add something to your tray.")
    .max(MAX_LINES),
  delivery: z.enum(DELIVERY_OPTIONS).optional(),
  name: z.string().trim().max(80).optional(),
  source: z.string().max(40).optional(),
});

export type WebOrderBody = z.input<typeof webOrderSchema>;

const FULFILMENT: Record<(typeof DELIVERY_OPTIONS)[number], Fulfilment> = { "Courtyard Pickup": "pickup", "Jubilee Hills Delivery": "delivery" };

export type PricedOrder = { items: OrderItem[]; fulfilment: Fulfilment | null; name: string | null; source: (typeof PUBLIC_SOURCES)[number] | null };

/** Checks the tray and prices it from the menu. An unknown menu id refuses the whole order. Repeated ids are merged. */
export function priceWebOrder(body: unknown): { ok: true; order: PricedOrder } | { ok: false; error: string } {
  const parsed = webOrderSchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "That order could not be read." };
  const qty = new Map<string, number>();
  for (const line of parsed.data.items) qty.set(line.id, (qty.get(line.id) ?? 0) + line.qty);
  const items: OrderItem[] = [];
  for (const [id, n] of qty) {
    const item = MENU_ITEMS.find((m) => m.id === id);
    if (!item) return { ok: false, error: "Something in your tray is no longer on the menu." };
    items.push({ id: item.id, name: item.name, category: item.category, qty: Math.min(n, MAX_QTY), unitPrice: item.price });
  }
  const source = (PUBLIC_SOURCES as readonly string[]).includes(parsed.data.source ?? "") ? (parsed.data.source as PricedOrder["source"]) : null;
  return {
    ok: true,
    order: { items, fulfilment: parsed.data.delivery ? FULFILMENT[parsed.data.delivery] : null, name: parsed.data.name || null, source },
  };
}
