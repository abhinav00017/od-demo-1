import type { NextRequest } from "next/server";
import { isUuid } from "@/lib/cafeEvents";
import { json, owner } from "@/lib/cafeEvents/http";
import { fieldErrors, statusBody } from "@/lib/cafeEvents/validation";

const notFound = () => json({ ok: false, error: "No enquiry with that id." }, 404);

/** Moves an enquiry to new, contacted, confirmed or declined. Owner only. */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/cafe/admin/enquiries/[id]">) {
  const { id } = await ctx.params;
  return owner(req, "enquiry status", async ({ store, cafeSlug }) => {
    if (!isUuid(id)) return notFound();
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "Send the request as JSON." }, 400);
    }
    const parsed = statusBody.safeParse(body);
    if (!parsed.success) {
      const errors = fieldErrors(parsed.error);
      return json({ ok: false, error: Object.values(errors)[0], fieldErrors: errors }, 400);
    }
    const enquiry = await store.setStatus(cafeSlug, id, parsed.data.status);
    return enquiry ? json({ ok: true, enquiry }) : notFound();
  });
}
