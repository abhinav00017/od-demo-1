import type { NextRequest } from "next/server";
import { HONEYPOT_FIELD, normalisePhone, parseBookingBody, parseDay, validateBooking } from "@/demos/lotus-clinic/booking";
import { ADMIN_COOKIE, isAdminRequest } from "@/lib/admin/auth";
import { CLINIC_SLUG, clinicToday, getStore, type Booking } from "@/lib/bookings";
import { json, NOT_LOGGED_IN } from "@/lib/bookings/http";
import { notifyClinic, runAfterResponse } from "@/lib/bookings/notify";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/** Saves a booking from the Lotus booking form. Runs the same checks as the form. */
export async function POST(req: NextRequest) {
  if (!rateLimit(`book:${clientIp(req.headers)}`)) {
    return json({ ok: false, error: "Too many booking requests. Please wait a minute and try again." }, 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Send the booking as JSON." }, 400);
  }

  const input = parseBookingBody(body);
  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const today = clinicToday();

  // A bot filled the hidden field. Answer as if it worked, and save nothing.
  if (typeof raw[HONEYPOT_FIELD] === "string" && raw[HONEYPOT_FIELD].trim() !== "") {
    const fake: Booking = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      clinicSlug: CLINIC_SLUG,
      name: input.name.trim(),
      phone: normalisePhone(input.phone) ?? "",
      visitType: input.visitType,
      date: input.date,
      slot: input.slot,
      reason: input.reason,
      status: "new",
      notes: null,
    };
    return json({ ok: true, id: fake.id, booking: fake }, 201);
  }

  const fieldErrors = validateBooking(input, parseDay(today)!);
  if (Object.keys(fieldErrors).length) {
    return json({ ok: false, error: "Please check the highlighted fields.", fieldErrors }, 400);
  }

  let booking: Booking;
  try {
    booking = await getStore().create({
      clinicSlug: CLINIC_SLUG,
      name: input.name.trim(),
      phone: normalisePhone(input.phone)!,
      visitType: input.visitType,
      date: input.date,
      slot: input.slot,
      reason: input.reason,
    });
  } catch (err) {
    console.error(`booking save failed: ${err instanceof Error ? err.message : "unknown error"}`);
    return json({ ok: false, error: "We could not save your booking. Please try again." }, 500);
  }

  const dashboardUrl = new URL("/clinic/website/admin", req.nextUrl.origin).toString();
  runAfterResponse(() => notifyClinic(booking, { dashboardUrl }));

  return json({ ok: true, id: booking.id, booking }, 201);
}

/** Bookings from today (clinic time) onward. Admin only. */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req.cookies.get(ADMIN_COOKIE)?.value)) return json(NOT_LOGGED_IN, 401);
  const store = getStore();
  const today = clinicToday();
  try {
    const bookings = await store.list({ from: today, clinicSlug: CLINIC_SLUG });
    return json({ ok: true, today, storage: store.kind, bookings });
  } catch (err) {
    console.error(`booking list failed: ${err instanceof Error ? err.message : "unknown error"}`);
    return json({ ok: false, error: "Could not load bookings." }, 500);
  }
}
