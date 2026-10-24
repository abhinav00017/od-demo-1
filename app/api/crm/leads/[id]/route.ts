import type { NextRequest } from "next/server";
import { crm, json, notFound, parseBody } from "@/lib/crm/http";
import { isUuid } from "@/lib/crm/types";
import { leadPatchBody } from "@/lib/crm/validation";

/** One lead with its quotes, follow-ups and WhatsApp messages. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/crm/leads/[id]">) {
  const { id } = await ctx.params;
  return crm(req, "lead get", async ({ store, shop }) => {
    if (!isUuid(id)) return notFound("lead");
    const lead = await store.getLead(shop.slug, id);
    if (!lead) return notFound("lead");
    const [quotes, followups, messages] = await Promise.all([
      store.listQuotes(shop.slug, { leadId: id }),
      store.listFollowups(shop.slug, { leadId: id }),
      store.listMessages(shop.slug, { leadId: id }),
    ]);
    return json({ ok: true, lead, quotes, followups, messages });
  });
}

/** Edit name, source or notes, or mark the lead lost (or a lead again). */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/crm/leads/[id]">) {
  const { id } = await ctx.params;
  return crm(req, "lead update", async ({ store, shop }) => {
    if (!isUuid(id)) return notFound("lead");
    const body = await parseBody(req, leadPatchBody);
    if (!body.ok) return body.res;
    const current = await store.getLead(shop.slug, id);
    if (!current) return notFound("lead");
    if (body.data.status && current.status === "customer") return json({ ok: false, error: "A customer stays a customer." }, 409);
    const lead = await store.updateLead(shop.slug, id, body.data);
    return json({ ok: true, lead });
  });
}
