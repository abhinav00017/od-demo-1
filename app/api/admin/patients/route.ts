import type { NextRequest } from "next/server";
import { CLINIC_SLUG, getStore } from "@/lib/bookings";
import { isAdmin } from "@/lib/bookings/adminHttp";
import { json, NOT_LOGGED_IN } from "@/lib/bookings/http";

/** Everyone who ever booked, grouped by phone, most recently booked first. Admin only. */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return json(NOT_LOGGED_IN, 401);
  try {
    const patients = await getStore().patients({ clinicSlug: CLINIC_SLUG });
    return json({ ok: true, patients });
  } catch (err) {
    console.error(`patient list failed: ${err instanceof Error ? err.message : "unknown error"}`);
    return json({ ok: false, error: "Could not load patients." }, 500);
  }
}
