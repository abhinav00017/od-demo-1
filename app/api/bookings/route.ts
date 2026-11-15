import type { NextRequest } from "next/server";
import { isAdminRequest, ADMIN_COOKIE } from "@/lib/admin/auth";
import { CLINIC_SLUG, clinicToday, getStore } from "@/lib/bookings";
import { json, NOT_LOGGED_IN } from "@/lib/bookings/http";
import { submitPublicBooking } from "@/lib/bookings/publicBooking";
import { withWhatsApp } from "@/lib/bookings/whatsappSummary";
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

  // The same service Ogi's Confirm button uses: checks, consent line, save, clinic alert and WhatsApp.
  const result = await submitPublicBooking(body, { origin: req.nextUrl.origin });
  return json(result.body, result.status);
}

/** Bookings this many days back count toward "Bookings by source". */
const SOURCE_WINDOW_DAYS = 30;

/**
 * The dashboard's live data, polled every 5 s. Admin only.
 * `bookings`: today (clinic time) onward. `needsAction`: status new on any day, wants a new time, or No WhatsApp still to call.
 * `sources`: bookings created in the last 30 days, by source. Each booking carries its latest WhatsApp message.
 */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req.cookies.get(ADMIN_COOKIE)?.value)) return json(NOT_LOGGED_IN, 401);
  const store = getStore();
  const today = clinicToday();
  try {
    const [list, waiting] = await Promise.all([store.list({ from: today, clinicSlug: CLINIC_SLUG }), store.needsAction({ clinicSlug: CLINIC_SLUG, today })]);
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
