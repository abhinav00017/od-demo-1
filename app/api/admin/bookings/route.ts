import type { NextRequest } from "next/server";
import { normalisePhone, parseDay, validateBooking, type BookingInput } from "@/demos/lotus-clinic/booking";
import { CLINIC_SLUG, clinicToday, getStore, isBookingStatus, STAFF_SOURCES, type Booking } from "@/lib/bookings";
import { isAdmin, isDay, readJson } from "@/lib/bookings/adminHttp";
import { consentNow } from "@/lib/bookings/consent";
import { json, NOT_LOGGED_IN } from "@/lib/bookings/http";
import { runAfterResponse } from "@/lib/bookings/notify";
import { withWhatsApp } from "@/lib/bookings/whatsappSummary";
import { sendBookingMessage } from "@/lib/whatsapp/notify";

/**
 * Bookings between two days, for the Past tab. Admin only.
 * ?from=YYYY-MM-DD&to=YYYY-MM-DD (both included, at most 366 days apart) and an optional ?status=visited|no_show|cancelled|...
 * Newest day first, each with its latest WhatsApp message.
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return json(NOT_LOGGED_IN, 401);
  const params = req.nextUrl.searchParams;
  const from = params.get("from");
  const to = params.get("to");
  const status = params.get("status");
  if (!isDay(from) || !isDay(to) || !parseDay(from) || !parseDay(to) || from > to) {
    return json({ ok: false, error: "Send from and to as YYYY-MM-DD, from on or before to." }, 400);
  }
  if (Date.parse(to) - Date.parse(from) > 366 * 24 * 60 * 60 * 1000) return json({ ok: false, error: "Ask for a year or less at a time." }, 400);
  if (status && !isBookingStatus(status)) return json({ ok: false, error: "Unknown status." }, 400);
  try {
    const store = getStore();
    const list = await store.list({ from, to, clinicSlug: CLINIC_SLUG, statuses: status && isBookingStatus(status) ? [status] : undefined });
    const bookings = await withWhatsApp(store, list.reverse());
    return json({ ok: true, from, to, bookings });
  } catch (err) {
    console.error(`booking range failed: ${err instanceof Error ? err.message : "unknown error"}`);
    return json({ ok: false, error: "Could not load bookings." }, 500);
  }
}

/**
 * A booking staff enter themselves: a walk-in, a phone call, a referral. Admin only.
 * Same checks as the website form. Starts confirmed. sendWhatsApp true = the patient agreed at the desk: the booking stores
 * staff consent (STAFF_CONSENT_TEXT_V1) and gets the confirmation. Otherwise no consent, and no WhatsApp is ever sent for it.
 */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return json(NOT_LOGGED_IN, 401);
  const body = await readJson(req);
  if (!body) return json({ ok: false, error: "Send the booking as JSON." }, 400);
  const text = (key: string) => (typeof body[key] === "string" ? (body[key] as string) : "");
  const input: BookingInput = {
    name: text("name"),
    phone: text("phone"),
    visitType: text("visitType"),
    date: text("date"),
    slot: text("slot"),
    reason: text("reason"),
    consent: true,
  };
  const fieldErrors: Record<string, string> = { ...validateBooking(input, parseDay(clinicToday())!) };
  const source = body.source;
  if (!(STAFF_SOURCES as readonly unknown[]).includes(source)) fieldErrors.source = "Choose where this booking came from.";
  if (Object.keys(fieldErrors).length) return json({ ok: false, error: "Please check the highlighted fields.", fieldErrors }, 400);

  const sendWhatsApp = body.sendWhatsApp === true;
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
      status: "confirmed",
      source: source as (typeof STAFF_SOURCES)[number],
      consent: sendWhatsApp ? consentNow("staff") : null,
    });
  } catch (err) {
    console.error(`staff booking save failed: ${err instanceof Error ? err.message : "unknown error"}`);
    return json({ ok: false, error: "Could not save the booking. Try again." }, 500);
  }
  if (sendWhatsApp) runAfterResponse(() => sendBookingMessage(booking, "confirmation", { store: getStore() }));
  return json({ ok: true, booking: { ...booking, whatsapp: null }, sendWhatsApp }, 201);
}
