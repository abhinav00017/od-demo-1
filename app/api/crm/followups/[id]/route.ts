import type { NextRequest } from "next/server";
import { crm, json, notFound, parseBody } from "@/lib/crm/http";
import { completeFollowup, snoozeFollowup } from "@/lib/crm/service";
import { isUuid } from "@/lib/crm/types";
import { followupActionBody } from "@/lib/crm/validation";

/** Done (with an optional result) or snooze (default 2 days). */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/crm/followups/[id]">) {
  const { id } = await ctx.params;
  return crm(req, "followup update", async ({ store, shop }) => {
    if (!isUuid(id)) return notFound("follow-up");
    const body = await parseBody(req, followupActionBody);
    if (!body.ok) return body.res;
    const f = (await store.listFollowups(shop.slug, { open: true })).find((x) => x.id === id);
    if (!f) return json({ ok: false, error: "That follow-up is already closed." }, 404);
    const followup =
      body.data.action === "done"
        ? await completeFollowup(store, shop.slug, f, body.data.result, new Date().toISOString())
        : await snoozeFollowup(store, shop.slug, f, body.data.days);
    return json({ ok: true, followup });
  });
}
