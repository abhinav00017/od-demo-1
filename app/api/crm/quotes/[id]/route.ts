import type { NextRequest } from "next/server";
import { crm, json, notFound, parseBody } from "@/lib/crm/http";
import { isOpenQuote, priceQuote, QuoteInputError } from "@/lib/crm/service";
import { isUuid } from "@/lib/crm/types";
import { quoteSaveBody } from "@/lib/crm/validation";

/** One quote with its lines and its lead. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/crm/quotes/[id]">) {
  const { id } = await ctx.params;
  return crm(req, "quote get", async ({ store, shop }) => {
    if (!isUuid(id)) return notFound("quote");
    const quote = await store.getQuote(shop.slug, id);
    if (!quote) return notFound("quote");
    const lead = await store.getLead(shop.slug, quote.leadId);
    return json({ ok: true, quote, lead });
  });
}

/** Saves the lines, discount and notes of a draft or sent quote. A sold or lost quote is closed. */
export async function PUT(req: NextRequest, ctx: RouteContext<"/api/crm/quotes/[id]">) {
  const { id } = await ctx.params;
  return crm(req, "quote save", async ({ store, shop }) => {
    if (!isUuid(id)) return notFound("quote");
    const body = await parseBody(req, quoteSaveBody);
    if (!body.ok) return body.res;
    const current = await store.getQuote(shop.slug, id);
    if (!current) return notFound("quote");
    if (!isOpenQuote(current)) return json({ ok: false, error: `Quote ${current.number} is ${current.status} and can no longer change.` }, 409);
    try {
      const keep = new Set(current.items.map((i) => i.productId));
      const content = priceQuote(await store.listProducts(shop.slug), body.data.items, body.data.discount, body.data.notes, keep);
      const quote = await store.saveQuote(shop.slug, id, content);
      return json({ ok: true, quote });
    } catch (err) {
      if (err instanceof QuoteInputError) return json({ ok: false, error: err.message }, 400);
      throw err;
    }
  });
}
