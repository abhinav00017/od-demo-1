import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { json } from "@/lib/cafeEvents/http";
import { HONEYPOT } from "@/lib/cafeEvents/validation";
import { CAFE_SLUG, getOrderStore, orderReferenceOf, sumTotal } from "@/lib/cafeOrders";
import { priceWebOrder } from "@/lib/cafeOrders/pricing";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/**
 * Saves an order from the Solstice website's order tray, just before WhatsApp opens. Public. The browser sends menu ids
 * and quantities only; names, prices and the total come from the menu on the server. 201 with the reference and the
 * server's total, or 400. 10 a minute per IP. If this fails the tray still opens WhatsApp, without a reference.
 */
export async function POST(req: NextRequest) {
  if (!rateLimit(`cafe-order:${clientIp(req.headers)}`)) {
    return json({ ok: false, error: "Too many orders. Please wait a minute and try again." }, 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Send the order as JSON." }, 400);
  }

  // A bot filled the hidden field. Answer as if it worked, and save nothing.
  if (body && typeof body === "object" && typeof (body as Record<string, unknown>)[HONEYPOT] === "string" && (body as Record<string, string>)[HONEYPOT].trim()) {
    return json({ ok: true, reference: orderReferenceOf(randomUUID()), total: 0 }, 201);
  }

  const priced = priceWebOrder(body);
  if (!priced.ok) return json({ ok: false, error: priced.error }, 400);

  try {
    const order = await getOrderStore().create({ cafeSlug: CAFE_SLUG, channel: "website", phone: null, ...priced.order });
    return json({ ok: true, reference: order.reference, total: sumTotal(order.items) }, 201);
  } catch (err) {
    console.error(`cafe order save failed: ${err instanceof Error ? err.message : "unknown error"}`);
    return json({ ok: false, error: "We could not save your order." }, 500);
  }
}
