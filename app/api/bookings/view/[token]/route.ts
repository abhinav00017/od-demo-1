import type { NextRequest } from "next/server";
import { CLINIC_SLUG, clinicToday, getStore, type Booking } from "@/lib/bookings";
import { readJson } from "@/lib/bookings/adminHttp";
import { json } from "@/lib/bookings/http";
import { MAX_DAYS_AHEAD, newTimeError } from "@/lib/bookings/newTime";
import { isViewToken } from "@/lib/bookings/viewToken";
import { publicVisit } from "@/lib/bookings/publicVisit";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/**
 * The patient's own page, /clinic/website/v/<token>. No login: the token is the key.
 * GET: the visit (day, slot, visit type, status, any requested new time). Never the name, phone, reason or notes.
 * POST {"action": "change", "date", "slot"}: asks for another day or slot (the dashboard shows "Wants a new time").
 * POST {"action": "cancel"}: cancels the visit.
 * Unknown token = 404. After the visit day the link has expired = 410. 30 calls a minute per IP.
 */

const NOT_FOUND = { ok: false, error: "This link is not valid. Please call the clinic." };
const EXPIRED = { ok: false, expired: true, error: "This link has expired." };
const LIMITED = { ok: false, error: "Too many requests. Please wait a minute and try again." };

type Found = { booking: Booking } | { response: Response };

async function find(req: NextRequest, token: string): Promise<Found> {
  if (!rateLimit(`view:${clientIp(req.headers)}`, { limit: 30 })) return { response: json(LIMITED, 429) };
  if (!isViewToken(token)) return { response: json(NOT_FOUND, 404) };
  const booking = await getStore().getByViewToken(token);
  if (!booking || booking.clinicSlug !== CLINIC_SLUG) return { response: json(NOT_FOUND, 404) };
  if (booking.date < clinicToday()) return { response: json(EXPIRED, 410) };
  return { booking };
}

export async function GET(req: NextRequest, ctx: RouteContext<"/api/bookings/view/[token]">) {
  const { token } = await ctx.params;
  try {
    const found = await find(req, token);
    if ("response" in found) return found.response;
    return json({ ok: true, today: clinicToday(), visit: publicVisit(found.booking) });
  } catch (err) {
    console.error(`patient page load failed: ${err instanceof Error ? err.message : "unknown error"}`);
    return json({ ok: false, error: "Could not load your visit. Please try again." }, 500);
  }
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/bookings/view/[token]">) {
  const { token } = await ctx.params;
  const body = await readJson(req);
  if (!body || (body.action !== "change" && body.action !== "cancel")) return json({ ok: false, error: "Send {\"action\":\"change\"} or {\"action\":\"cancel\"}." }, 400);
  try {
    const found = await find(req, token);
    if ("response" in found) return found.response;
    const { booking } = found;
    if (booking.status !== "new" && booking.status !== "confirmed") return json({ ok: false, error: "This visit can no longer be changed. Please call the clinic." }, 409);
    const store = getStore();
    if (body.action === "cancel") {
      const updated = await store.updateStatus(booking.id, "cancelled");
      return json({ ok: true, visit: publicVisit(updated ?? booking) });
    }
    const problem = newTimeError(body.date, body.slot, booking.visitType, clinicToday(), { maxDaysAhead: MAX_DAYS_AHEAD });
    if (problem) return json({ ok: false, error: problem }, 400);
    const updated = await store.requestNewTime(booking.id, body.date as string, body.slot as string);
    return json({ ok: true, visit: publicVisit(updated ?? booking) });
  } catch (err) {
    console.error(`patient page change failed: ${err instanceof Error ? err.message : "unknown error"}`);
    return json({ ok: false, error: "Could not save that. Please try again." }, 500);
  }
}
