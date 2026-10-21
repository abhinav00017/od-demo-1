import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, isAdminRequest } from "@/lib/admin/auth";
import { getStore, isBookingStatus, isUuid } from "@/lib/bookings";
import { json, NOT_LOGGED_IN } from "@/lib/bookings/http";

/** Sets a booking's status: new, confirmed or cancelled. Admin only. */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/bookings/[id]">) {
  if (!isAdminRequest(req.cookies.get(ADMIN_COOKIE)?.value)) return json(NOT_LOGGED_IN, 401);
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Send JSON like {\"status\":\"confirmed\"}." }, 400);
  }
  const status = body && typeof body === "object" ? (body as { status?: unknown }).status : undefined;
  if (!isBookingStatus(status)) return json({ ok: false, error: "Status must be new, confirmed or cancelled." }, 400);
  if (!isUuid(id)) return json({ ok: false, error: "No booking with that id." }, 404);

  try {
    const booking = await getStore().updateStatus(id, status);
    if (!booking) return json({ ok: false, error: "No booking with that id." }, 404);
    return json({ ok: true, booking });
  } catch (err) {
    console.error(`booking update failed: ${err instanceof Error ? err.message : "unknown error"}`);
    return json({ ok: false, error: "Could not update the booking." }, 500);
  }
}
