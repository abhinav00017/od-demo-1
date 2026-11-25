import type { NextRequest } from "next/server";
import { json, owner } from "@/lib/cafeEvents/http";
import { indiaToday } from "@/lib/cafeEvents/validation";
import { getOrderStore } from "@/lib/cafeOrders";
import { MENU_ITEMS } from "@/demos/solstice-cafe/data";
import { indiaDayHour, resolvePeriod, topItems, type Range } from "@/lib/ogi/cafeOwner";

/**
 * The owner page's small Orders summary: orders and sales in the last 7 days (India days, today included) and the
 * top 3 items by units sold. Owner only (cafe_session cookie).
 */
export async function GET(req: NextRequest) {
  return owner(req, "orders summary", async ({ cafeSlug }) => {
    const range = resolvePeriod("last_7_days", indiaToday()) as Range;
    const fromIso = new Date(Date.parse(`${range.from}T00:00:00Z`) - (5 * 60 + 30) * 60_000).toISOString();
    const orders = (await getOrderStore().list(cafeSlug, fromIso)).filter((o) => indiaDayHour(o.createdAt).day <= range.to);
    const top = topItems(orders, range, { rank: "best", by: "quantity", limit: 3 }, MENU_ITEMS);
    return json({
      ok: true,
      from: range.from,
      to: range.to,
      orders: orders.length,
      sales: orders.reduce((n, o) => n + o.total, 0),
      top: top.items.map((i) => ({ name: i.name, itemsSold: i.itemsSold })),
    });
  });
}
