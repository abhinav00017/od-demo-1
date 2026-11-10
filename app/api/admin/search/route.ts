import type { NextRequest } from "next/server";
import { CLINIC_SLUG, getStore } from "@/lib/bookings";
import { isAdmin, readJson } from "@/lib/bookings/adminHttp";
import { json, NOT_LOGGED_IN } from "@/lib/bookings/http";
import { withWhatsApp } from "@/lib/bookings/whatsappSummary";

/**
 * Bookings on any day whose name contains the text, or whose phone contains the digits. Admin only.
 * POST, so a phone number never sits in a URL or an access log. Body: {"q": "..."}. At most 100, newest day first.
 */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return json(NOT_LOGGED_IN, 401);
  const body = await readJson(req);
  const q = typeof body?.q === "string" ? body.q.trim().slice(0, 80) : "";
  if (q.length < 2) return json({ ok: false, error: "Type at least 2 characters." }, 400);
  try {
    const store = getStore();
    const bookings = await withWhatsApp(store, await store.search({ clinicSlug: CLINIC_SLUG, q }));
    return json({ ok: true, bookings });
  } catch (err) {
    console.error(`booking search failed: ${err instanceof Error ? err.message : "unknown error"}`);
    return json({ ok: false, error: "Could not search bookings." }, 500);
  }
}
