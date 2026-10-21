import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, isAdminRequest } from "@/lib/admin/auth";
import { getStore, isBookingStatus, isUuid } from "@/lib/bookings";
import { json, NOT_LOGGED_IN } from "@/lib/bookings/http";
import { runAfterResponse } from "@/lib/bookings/notify";
import { sendBookingMessage } from "@/lib/whatsapp/notify";

/**
 * Sets a booking's status: new, confirmed or cancelled. Admin only.
 * Confirming sends the WhatsApp confirmation after the response. A failed send never fails the change.
 */
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
    const store = getStore();
    const booking = await store.updateStatus(id, status);
    if (!booking) return json({ ok: false, error: "No booking with that id." }, 404);
    if (status === "confirmed") {
      runAfterResponse(async () => {
        // One confirmation per booking. A second Confirm click, or a retry, sends nothing new.
        // A failed send can be retried by confirming again.
        const sent = (await store.listMessagesForBookings([booking.id])).some((m) => m.kind === "confirmation" && m.status !== "failed");
        if (!sent) await sendBookingMessage(booking, "confirmation", { store });
      });
    }
    // TODO(level 3 part 2): on "cancelled", send a cancellation template once one is approved.
    return json({ ok: true, booking });
  } catch (err) {
    console.error(`booking update failed: ${err instanceof Error ? err.message : "unknown error"}`);
    return json({ ok: false, error: "Could not update the booking." }, 500);
  }
}
