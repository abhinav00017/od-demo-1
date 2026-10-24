import type { NextRequest } from "next/server";
import { crm, json } from "@/lib/crm/http";

/** Customers (leads with a sold quote), newest conversion first, with their quotes and what they spent. */
export async function GET(req: NextRequest) {
  return crm(req, "customers", async ({ store, shop }) => {
    const [leads, quotes] = await Promise.all([store.listLeads(shop.slug), store.listQuotes(shop.slug)]);
    const customers = leads
      .filter((l) => l.status === "customer")
      .map((l) => {
        const own = quotes.filter((q) => q.leadId === l.id);
        return { ...l, quotes: own, spent: own.filter((q) => q.status === "sold").reduce((sum, q) => sum + q.total, 0) };
      })
      .sort((a, b) => (b.convertedAt ?? "").localeCompare(a.convertedAt ?? ""));
    return json({ ok: true, customers });
  });
}
