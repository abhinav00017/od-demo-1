import type { NextRequest } from "next/server";
import { crm, json, notFound, parseBody } from "@/lib/crm/http";
import { addDays } from "@/lib/crm/time";
import { isUuid } from "@/lib/crm/types";
import { followupCreateBody } from "@/lib/crm/validation";

/** Adds a call follow-up for a lead, due in N days (0 = today). */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/crm/leads/[id]/followups">) {
  const { id } = await ctx.params;
  return crm(req, "followup create", async ({ store, shop }) => {
    if (!isUuid(id)) return notFound("lead");
    const body = await parseBody(req, followupCreateBody);
    if (!body.ok) return body.res;
    const lead = await store.getLead(shop.slug, id);
    if (!lead) return notFound("lead");
    const followup = await store.createFollowup(shop.slug, {
      leadId: id,
      quoteId: body.data.quoteId ?? null,
      kind: "call",
      dueAt: addDays(new Date(), body.data.inDays).toISOString(),
    });
    await store.refreshNextFollowUp(shop.slug, id);
    return json({ ok: true, followup }, 201);
  });
}
