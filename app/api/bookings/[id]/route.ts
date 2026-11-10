import type { NextRequest } from "next/server";
import { parseDay } from "@/demos/lotus-clinic/booking";
import { clinic } from "@/demos/lotus-clinic/data";
import { ADMIN_COOKIE, isAdminRequest } from "@/lib/admin/auth";
import { ATTENDANCE_STATUSES, clinicToday, getStore, isBookingStatus, isUuid, type Booking, type BookingStore } from "@/lib/bookings";
import { json, NOT_LOGGED_IN } from "@/lib/bookings/http";
import { runAfterResponse } from "@/lib/bookings/notify";
import { sendBookingMessage } from "@/lib/whatsapp/notify";

const NOT_FOUND = { ok: false, error: "No booking with that id." };

/** One confirmation per booking. A second Confirm click, or a retry, sends nothing new. A failed send can be retried by confirming again. */
function confirmOnce(store: BookingStore, booking: Booking) {
  runAfterResponse(async () => {
    const sent = (await store.listMessagesForBookings([booking.id])).some((m) => m.kind === "confirmation" && m.status !== "failed");
    if (!sent) await sendBookingMessage(booking, "confirmation", { store });
  });
}

/** A new day and slot for a booking. Today or later, a real slot, and no clinic visits on Sundays. Returns an error or null. */
function rescheduleError(date: unknown, slot: unknown, visitType: string, today: string) {
  const day = typeof date === "string" ? parseDay(date) : undefined;
  if (!day || typeof date !== "string" || date < today) return "Choose today or a later date.";
  if (day.getDay() === 0 && visitType === "clinic") return "The clinic is closed on Sundays. Choose another day.";
  if (typeof slot !== "string" || !(clinic.booking.slots as readonly string[]).includes(slot)) return "Choose a time of day.";
  return null;
}

/**
 * Changes a booking. Admin only.
 * {"status": ...}: new, confirmed, cancelled, visited or no_show. Visited and no-show only on the booking's day or later.
 * Confirming sends the WhatsApp confirmation after the response; nothing else sends anything. A failed send never fails the change.
 * {"date", "slot"}: reschedules (for "Wants a new time"): the booking moves, is confirmed, and the patient gets a confirmation for the new time.
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
  const b = body && typeof body === "object" ? (body as { status?: unknown; date?: unknown; slot?: unknown }) : {};
  const reschedule = b.date !== undefined || b.slot !== undefined;
  if (!reschedule && !isBookingStatus(b.status)) return json({ ok: false, error: "Status must be new, confirmed, cancelled, visited or no_show." }, 400);
  if (!isUuid(id)) return json(NOT_FOUND, 404);

  try {
    const store = getStore();
    const today = clinicToday();
    const current = await store.get(id);
    if (!current) return json(NOT_FOUND, 404);

    if (reschedule) {
      const problem = rescheduleError(b.date, b.slot, current.visitType, today);
      if (problem) return json({ ok: false, error: problem }, 400);
      const booking = await store.reschedule(id, b.date as string, b.slot as string);
      if (!booking) return json(NOT_FOUND, 404);
      // The time changed, so the patient gets a confirmation for the new one even if they had one before.
      runAfterResponse(() => sendBookingMessage(booking, "confirmation", { store }));
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
