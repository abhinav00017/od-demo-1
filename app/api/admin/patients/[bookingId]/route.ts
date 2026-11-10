import type { NextRequest } from "next/server";
import { CLINIC_SLUG, getStore, isUuid, type BookingStore } from "@/lib/bookings";
import { isAdmin, readJson } from "@/lib/bookings/adminHttp";
import { json, NOT_LOGGED_IN } from "@/lib/bookings/http";
import { withWhatsApp } from "@/lib/bookings/whatsappSummary";

/** Longest front-desk note the dashboard saves. */
const MAX_NOTES = 2000;
const NOT_FOUND = { ok: false, error: "No booking with that id." };

/** The patient behind a booking is everyone with the same phone. Found by booking id, so no phone number goes in a URL. */
async function patientPhone(store: BookingStore, bookingId: string) {
  if (!isUuid(bookingId)) return null;
  const b = await store.get(bookingId);
  return b && b.clinicSlug === CLINIC_SLUG ? b.phone : null;
}

/** The patient's history: every booking by that phone, newest first, with WhatsApp status, and the front-desk notes. Admin only. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/admin/patients/[bookingId]">) {
  if (!isAdmin(req)) return json(NOT_LOGGED_IN, 401);
  const { bookingId } = await ctx.params;
  try {
    const store = getStore();
    const phone = await patientPhone(store, bookingId);
    if (!phone) return json(NOT_FOUND, 404);
    const [history, notes] = await Promise.all([
      store.historyByPhone({ clinicSlug: CLINIC_SLUG, phone }),
      store.getNotes({ clinicSlug: CLINIC_SLUG, phone }).catch(() => null),
    ]);
    const visits = await withWhatsApp(store, history);
    return json({ ok: true, phone, visits, notes });
  } catch (err) {
    console.error(`patient history failed: ${err instanceof Error ? err.message : "unknown error"}`);
    return json({ ok: false, error: "Could not load the patient." }, 500);
  }
}

/** Saves the front-desk notes for the patient behind a booking. Body: {"notes": "..."}. Admin only. */
export async function PUT(req: NextRequest, ctx: RouteContext<"/api/admin/patients/[bookingId]">) {
  if (!isAdmin(req)) return json(NOT_LOGGED_IN, 401);
  const { bookingId } = await ctx.params;
  const body = await readJson(req);
  if (!body || typeof body.notes !== "string") return json({ ok: false, error: "Send JSON like {\"notes\":\"...\"}." }, 400);
  if (body.notes.length > MAX_NOTES) return json({ ok: false, error: `Keep notes to ${MAX_NOTES} characters.` }, 400);
  try {
    const store = getStore();
    const phone = await patientPhone(store, bookingId);
    if (!phone) return json(NOT_FOUND, 404);
    const notes = await store.setNotes({ clinicSlug: CLINIC_SLUG, phone, notes: body.notes.trim() });
    return json({ ok: true, notes });
  } catch (err) {
    console.error(`notes save failed: ${err instanceof Error ? err.message : "unknown error"}`);
    return json({ ok: false, error: "Could not save the notes." }, 500);
  }
}
