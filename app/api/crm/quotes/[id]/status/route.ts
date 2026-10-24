import type { NextRequest } from "next/server";
import { crm, json, notFound, parseBody } from "@/lib/crm/http";
import { isOpenQuote, setQuoteClosed } from "@/lib/crm/service";
import { isUuid } from "@/lib/crm/types";
import { quoteStatusBody } from "@/lib/crm/validation";

/** Mark sold (the lead becomes a customer) or lost. Only a draft or sent quote can close. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/crm/quotes/[id]/status">) {
  const { id } = await ctx.params;
  return crm(req, "quote status", async ({ store, shop }) => {
    if (!isUuid(id)) return notFound("quote");
    const body = await parseBody(req, quoteStatusBody);
    if (!body.ok) return body.res;
    const current = await store.getQuote(shop.slug, id);
    if (!current) return notFound("quote");
    if (!isOpenQuote(current)) return json({ ok: false, error: `Quote ${current.number} is already ${current.status}.` }, 409);
    const result = await setQuoteClosed(store, shop.slug, current, body.data.status, new Date().toISOString());
    return json({ ok: true, ...result });
  });
}
