import type { NextRequest } from "next/server";
import { json } from "@/lib/bookings/http";
import { getCrmStore } from "@/lib/crm";
import { checkPassword } from "@/lib/admin/auth";
import { coverage, validUntil } from "@/lib/crm/math";
import { DEFAULT_SHOP } from "@/lib/crm/shop";
import { clientIp, rateLimit } from "@/lib/rateLimit";

const NOT_FOUND = { ok: false, error: "This quote link is not valid. Ask the showroom to send it again." };

/**
 * The customer's view of one quote, for /tiles/crm/q/[number]. No login, so it needs the link's key (?k=).
 * Answers only what the printed quote shows: no ids, no phone number, no other quotes.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/crm/public/quotes/[number]">) {
  const { number } = await ctx.params;
  const key = req.nextUrl.searchParams.get("k") ?? "";
  if (!rateLimit(`crm-quote:${clientIp(req.headers)}`, { limit: 30 })) return json({ ok: false, error: "Too many requests. Try again in a minute." }, 429);
  if (!/^[A-Z]{1,4}-\d{4,6}$/.test(number) || !key) return json(NOT_FOUND, 404);
  try {
    const store = await getCrmStore();
    const shop = DEFAULT_SHOP;
    const quote = await store.getQuoteByNumber(shop.slug, number);
    // Same answer for a wrong key and a missing quote, so the link cannot be guessed number by number.
    if (!quote || !checkPassword(key, quote.publicKey)) return json(NOT_FOUND, 404);
    const lead = await store.getLead(shop.slug, quote.leadId);
    return json({
      ok: true,
      shop: { name: shop.name, area: shop.area, city: shop.city, phoneDisplay: shop.phoneDisplay, hours: shop.hours },
      quote: {
        number: quote.number,
        status: quote.status,
        date: quote.sentAt ?? quote.createdAt,
        validUntil: validUntil(quote),
        expired: quote.status !== "sold" && Date.parse(validUntil(quote)) < Date.now(),
        customerName: lead?.name ?? "",
        subtotal: quote.subtotal,
        discount: quote.discount,
        total: quote.total,
        notes: quote.notes,
        items: quote.items.map((i) => ({
          name: i.product?.name ?? "Product",
          brand: i.product?.brand ?? "",
          sizeMm: i.product?.sizeMm ?? "",
          finish: i.product?.finish ?? "",
          qtyBoxes: i.qtyBoxes,
          areaSqft: i.areaSqft,
          wastagePct: i.wastagePct,
          sqftCovered: i.product ? coverage(i.qtyBoxes, i.product.sqftPerBox) : null,
          unitPrice: i.unitPrice,
          lineTotal: i.lineTotal,
        })),
      },
    });
  } catch (err) {
    console.error(`crm public quote failed: ${err instanceof Error ? err.message : "unknown error"}`);
    return json({ ok: false, error: "Could not load the quote. Try again." }, 500);
  }
}
