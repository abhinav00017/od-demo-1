import type { NextRequest } from "next/server";
import { CLINIC_SLUG, clinicToday, getStore } from "@/lib/bookings";
import { demoResetEnabled, isAdmin } from "@/lib/bookings/adminHttp";
import { generateDemoData } from "@/lib/bookings/demoSeed";
import { json, NOT_LOGGED_IN } from "@/lib/bookings/http";

/**
 * Reset demo data: deletes the clinic's is_demo bookings (with their messages) and the notes on demo phones,
 * then writes fresh sample data for today. Real bookings (is_demo false) are never touched. Admin only.
 * Off when DEMO_RESET_DISABLED=1.
 */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return json(NOT_LOGGED_IN, 401);
  if (!demoResetEnabled()) return json({ ok: false, error: "Reset demo data is turned off here." }, 403);
  try {
    const result = await getStore().replaceDemoData(CLINIC_SLUG, generateDemoData(clinicToday()));
    console.log(`demo reset: ${result.deleted} demo bookings removed, ${result.inserted} added`);
    return json({ ok: true, ...result });
  } catch (err) {
    console.error(`demo reset failed: ${err instanceof Error ? err.message : "unknown error"}`);
    return json({ ok: false, error: "Could not reset the demo data." }, 500);
  }
}
