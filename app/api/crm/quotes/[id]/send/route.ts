import type { NextRequest } from "next/server";
import { crm, json, notFound } from "@/lib/crm/http";
import { sendCrmMessage } from "@/lib/crm/notify";
import { isOpenQuote } from "@/lib/crm/service";
import { isUuid } from "@/lib/crm/types";

/**
 * Sends the quote on WhatsApp: a short summary and the link to the printable quote page. A draft becomes "sent".
 * Sending again re-sends it. A failed send leaves the quote as it was and answers 502 with the reason.
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/crm/quotes/[id]/send">) {
  const { id } = await ctx.params;
  return crm(req, "quote send", async ({ store, shop }) => {
    if (!isUuid(id)) return notFound("quote");
    const current = await store.getQuote(shop.slug, id);
    if (!current) return notFound("quote");
    if (!isOpenQuote(current)) return json({ ok: false, error: `Quote ${current.number} is ${current.status}.` }, 409);
    if (current.items.length === 0) return json({ ok: false, error: "Add a product before sending." }, 400);
    const lead = await store.getLead(shop.slug, current.leadId);
    if (!lead) return notFound("lead");
    const message = await sendCrmMessage("quote_sent", { store, shop, lead, quote: current, origin: req.nextUrl.origin });
    if (!message || message.status === "failed") {
      return json({ ok: false, error: `WhatsApp did not send: ${message?.error ?? "unknown error"}`, message }, 502);
    }
    const at = new Date().toISOString();
    const quote = await store.setQuoteStatus(shop.slug, id, "sent", at);
    await store.touchLead(shop.slug, lead.id, at);
    return json({ ok: true, quote, message });
  });
}
