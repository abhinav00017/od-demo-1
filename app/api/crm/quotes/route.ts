import type { NextRequest } from "next/server";
import { crm, json, notFound, parseBody } from "@/lib/crm/http";
import { newPublicKey } from "@/lib/crm/seed";
import { priceQuote, QuoteInputError } from "@/lib/crm/service";
import { quoteCreateBody } from "@/lib/crm/validation";

/** A new draft quote for a lead. Prices come from the catalogue; boxes from the area when one is given. */
export async function POST(req: NextRequest) {
  return crm(req, "quote create", async ({ store, shop }) => {
    const body = await parseBody(req, quoteCreateBody);
    if (!body.ok) return body.res;
    const lead = await store.getLead(shop.slug, body.data.leadId);
    if (!lead) return notFound("lead");
    if (lead.status === "lost") return json({ ok: false, error: "This lead is marked lost. Reopen it first." }, 409);
    try {
      const content = priceQuote(await store.listProducts(shop.slug), body.data.items, body.data.discount, body.data.notes);
      const quote = await store.createQuote(shop.slug, lead.id, content, { prefix: shop.prefix, publicKey: newPublicKey() });
      return json({ ok: true, quote }, 201);
    } catch (err) {
      if (err instanceof QuoteInputError) return json({ ok: false, error: err.message }, 400);
      throw err;
    }
  });
}
