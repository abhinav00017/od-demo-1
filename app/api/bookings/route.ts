import type { NextRequest } from "next/server";
import { HONEYPOT_FIELD, normalisePhone, parseBookingBody, parseDay, validateBooking } from "@/demos/lotus-clinic/booking";
import { ADMIN_COOKIE, isAdminRequest } from "@/lib/admin/auth";
import { CLINIC_SLUG, clinicToday, getStore, type Booking } from "@/lib/bookings";
import { parseAttribution } from "@/lib/bookings/attribution";
import { json, NOT_LOGGED_IN } from "@/lib/bookings/http";
import { withWhatsApp } from "@/lib/bookings/whatsappSummary";
import { notifyClinic, runAfterResponse } from "@/lib/bookings/notify";
import { sendBookingMessage } from "@/lib/whatsapp/notify";
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
      wantsNewTime: false,
      source: "website",
      campaign: null,
      utm: null,
      isDemo: false,
    };
    return json({ ok: true, id: fake.id, booking: fake }, 201);
  }

  const fieldErrors = validateBooking(input, parseDay(today)!);
  if (Object.keys(fieldErrors).length) {
    return json({ ok: false, error: "Please check the highlighted fields.", fieldErrors }, 400);
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
    });
  } catch (err) {
    console.error(`booking save failed: ${err instanceof Error ? err.message : "unknown error"}`);
    return json({ ok: false, error: "We could not save your booking. Please try again." }, 500);
  }

  const dashboardUrl = new URL("/clinic/website/admin", req.nextUrl.origin).toString();
  runAfterResponse(() => notifyClinic(booking, { dashboardUrl }));
  // WhatsApp alert to the clinic's own number. Skipped with one log line when CLINIC_WHATSAPP is unset.
  runAfterResponse(() => sendBookingMessage(booking, "clinic_alert"));

  return json({ ok: true, id: booking.id, booking }, 201);
}

/** Bookings this many days back count toward "Bookings by source". */
const SOURCE_WINDOW_DAYS = 30;

/**
 * The dashboard's live data, polled every 5 s. Admin only.
 * `bookings`: today (clinic time) onward. `needsAction`: status new on any day, or wants a new time.
 * `sources`: bookings created in the last 30 days, by source. Each booking carries its latest WhatsApp message.
 */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req.cookies.get(ADMIN_COOKIE)?.value)) return json(NOT_LOGGED_IN, 401);
  const store = getStore();
  const today = clinicToday();
  try {
    const [list, waiting] = await Promise.all([store.list({ from: today, clinicSlug: CLINIC_SLUG }), store.needsAction({ clinicSlug: CLINIC_SLUG })]);
    // Sources are extra: if the query fails (say the column is not migrated yet), the bookings still load.
    const since = new Date(Date.now() - SOURCE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const sources = await store.sourceCounts({ clinicSlug: CLINIC_SLUG, since }).catch((err: unknown) => {
      console.error(`source counts failed: ${err instanceof Error ? err.message : "unknown error"}`);
      return {};
    });
    const seen = new Set(list.map((b) => b.id));
    const rows = await withWhatsApp(store, [...list, ...waiting.filter((b) => !seen.has(b.id))]);
    const byId = new Map(rows.map((b) => [b.id, b]));
    return json({
      ok: true,
      today,
      storage: store.kind,
      bookings: list.map((b) => byId.get(b.id)!),
      needsAction: waiting.map((b) => byId.get(b.id)!),
      sources,
    });
  } catch (err) {
    console.error(`booking list failed: ${err instanceof Error ? err.message : "unknown error"}`);
    return json({ ok: false, error: "Could not load bookings." }, 500);
  }
}
