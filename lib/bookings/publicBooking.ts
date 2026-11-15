import { HONEYPOT_FIELD, normalisePhone, parseBookingBody, parseDay, validateBooking, type FieldErrors } from "@/demos/lotus-clinic/booking";
import { parseAttribution } from "./attribution";
import { clinicToday } from "./clinicDay";
import { consentNow } from "./consent";
import { BOOKING_FLAG_DEFAULTS, CLINIC_SLUG, getStore, type Booking } from "./index";
import { notifyClinic, runAfterResponse } from "./notify";
import { sendBookingMessage } from "@/lib/whatsapp/notify";

export type PublicBookingResult =
  | { status: 201; body: { ok: true; id: string; booking: Booking } }
  | { status: 400; body: { ok: false; error: string; fieldErrors: FieldErrors } }
  | { status: 500; body: { ok: false; error: string } };

/**
 * The one way a visitor's booking is saved: the Lotus booking form (POST /api/bookings) and Ogi's Confirm button
 * (POST /api/ogi/confirm) both call this. Runs the same checks as the form, stores the website consent line, and
 * sends the same clinic alert and "request received" WhatsApp as before. `body` is untrusted JSON.
 */
export async function submitPublicBooking(body: unknown, { origin }: { origin: string }): Promise<PublicBookingResult> {
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
      wantsNewTime: false,
      source: "website",
      campaign: null,
      utm: null,
      isDemo: false,
      ...BOOKING_FLAG_DEFAULTS,
    };
    return { status: 201, body: { ok: true, id: fake.id, booking: fake } };
  }

  const fieldErrors = validateBooking(input, parseDay(today)!);
  if (Object.keys(fieldErrors).length) {
    return { status: 400, body: { ok: false, error: "Please check the highlighted fields.", fieldErrors } };
  }

  // Where the visitor first came from. Re-checked here, and only ever shown on the dashboard.
  const attribution = parseAttribution(body);

  let booking: Booking;
  try {
    booking = await getStore().create({
      ...attribution,
      clinicSlug: CLINIC_SLUG,
      name: input.name.trim(),
      phone: normalisePhone(input.phone)!,
      visitType: input.visitType,
      date: input.date,
      slot: input.slot,
      reason: input.reason,
      // The patient booked under the line CONSENT_TEXT_V1 (validateBooking refuses a request without consent: true).
      consent: consentNow("website"),
    });
  } catch (err) {
    console.error(`booking save failed: ${err instanceof Error ? err.message : "unknown error"}`);
    return { status: 500, body: { ok: false, error: "We could not save your booking. Please try again." } };
  }

  const dashboardUrl = new URL("/clinic/website/admin", origin).toString();
  runAfterResponse(() => notifyClinic(booking, { dashboardUrl }));
  // WhatsApp alert to the clinic's own number. Skipped with one log line when CLINIC_WHATSAPP is unset.
  runAfterResponse(() => sendBookingMessage(booking, "clinic_alert"));
  // "We've received your request": the same words the success screen shows. No buttons.
  runAfterResponse(() => sendBookingMessage(booking, "request_received"));

  return { status: 201, body: { ok: true, id: booking.id, booking } };
}
