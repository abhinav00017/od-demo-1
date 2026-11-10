import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, isAdminRequest } from "@/lib/admin/auth";
import { ATTENDANCE_STATUSES, clinicToday, getStore, isBookingStatus, isUuid, type Booking, type BookingStore } from "@/lib/bookings";
import { json, NOT_LOGGED_IN } from "@/lib/bookings/http";
import { newTimeError } from "@/lib/bookings/newTime";
import { runAfterResponse } from "@/lib/bookings/notify";
import { sendBookingMessage } from "@/lib/whatsapp/notify";
import { canMessage } from "@/lib/whatsapp/reachability";

const NOT_FOUND = { ok: false, error: "No booking with that id." };

/** One confirmation per booking. A second Confirm click, or a retry, sends nothing new. A failed send can be retried by confirming again. */
function confirmOnce(store: BookingStore, booking: Booking) {
  runAfterResponse(async () => {
    const sent = (await store.listMessagesForBookings([booking.id])).some((m) => m.kind === "confirmation" && m.status !== "failed");
    if (!sent) await sendBookingMessage(booking, "confirmation", { store });
  });
}

/**
 * Changes a booking. Admin only.
 * {"status": ...}: new, confirmed, cancelled, visited or no_show. Visited and no-show only on the booking's day or later.
 * Confirming sends the WhatsApp confirmation (with the "View or change" link) after the response; nothing else sends anything.
 * {"status": "confirmed", "byPhone": true}: "Confirmed by phone" for a No-WhatsApp booking. Sends nothing.
 * A cancelled booking stays cancelled: confirmed, visited or no_show on it (by phone too) answers 409.
 * {"date", "slot"}: staff change the day or slot. The booking moves and stays confirmed, and the patient gets "Your visit has moved"
 * with Confirm / Change; it waits for the patient (awaitingPatient) when they can be reached on WhatsApp.
 * A failed send never fails the change.
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
  const b = body && typeof body === "object" ? (body as { status?: unknown; date?: unknown; slot?: unknown; byPhone?: unknown }) : {};
  const reschedule = b.date !== undefined || b.slot !== undefined;
  if (!reschedule && !isBookingStatus(b.status)) return json({ ok: false, error: "Status must be new, confirmed, cancelled, visited or no_show." }, 400);
  if (!isUuid(id)) return json(NOT_FOUND, 404);

  try {
    const store = getStore();
    const today = clinicToday();
    const current = await store.get(id);
    if (!current) return json(NOT_FOUND, 404);

    if (reschedule) {
      const problem = newTimeError(b.date, b.slot, current.visitType, today);
      if (problem) return json({ ok: false, error: problem }, 400);
      if (current.status === "cancelled" || current.status === "visited" || current.status === "no_show") {
        return json({ ok: false, error: "Only new or confirmed bookings can move." }, 400);
      }
      // Wait for the patient only when the message can reach them; otherwise there is nothing to wait for.
      const awaitingPatient = await canMessage(store, current);
      const booking = await store.reschedule(id, b.date as string, b.slot as string, { awaitingPatient });
      if (!booking) return json(NOT_FOUND, 404);
      runAfterResponse(() => sendBookingMessage(booking, "visit_moved", { store }));
      return json({ ok: true, booking });
    }

    if (current.status === "cancelled" && (b.status === "confirmed" || b.status === "visited" || b.status === "no_show")) {
      return json({ ok: false, error: "This booking is cancelled. Make a new booking instead." }, 409);
    }

    if (b.byPhone === true) {
      if (b.status !== "confirmed") return json({ ok: false, error: "Confirmed by phone only confirms." }, 400);
      const booking = await store.confirmByPhone(id);
      if (!booking) return json(NOT_FOUND, 404);
      return json({ ok: true, booking });
    }

    const status = b.status as Booking["status"];
    if (ATTENDANCE_STATUSES.includes(status) && current.date > today) {
      return json({ ok: false, error: "Visited and No-show are only for today or earlier." }, 400);
    }
    const booking = await store.updateStatus(id, status);
    if (!booking) return json(NOT_FOUND, 404);
    if (status === "confirmed") confirmOnce(store, booking);
    // TODO(level 3 part 2): on "cancelled", send a cancellation template once one is approved.
    return json({ ok: true, booking });
  } catch (err) {
    console.error(`booking update failed: ${err instanceof Error ? err.message : "unknown error"}`);
    return json({ ok: false, error: "Could not update the booking." }, 500);
  }
}
