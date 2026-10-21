import type { NextRequest } from "next/server";
import { checkPassword } from "@/lib/admin/auth";
import { CLINIC_SLUG, clinicTomorrow, getStore } from "@/lib/bookings";
import { json } from "@/lib/bookings/http";
import { sendBookingMessage } from "@/lib/whatsapp/notify";

/**
 * Daily reminder job. Vercel Cron calls it at 12:30 UTC (6 pm in India) with "Authorization: Bearer CRON_SECRET".
 * Sends the reminder template to every confirmed booking for tomorrow (India time) that has no reminder logged yet.
 */
export async function GET(req: NextRequest) {
  // Read the request first. That keeps the route dynamic, so the build never prerenders a 503.
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.log("reminders: CRON_SECRET not set, refused");
    return json({ ok: false, error: "CRON_SECRET is not set." }, 503);
  }
  // Constant-time compare, the same helper the admin login uses.
  if (!checkPassword(auth, `Bearer ${secret}`)) return json({ ok: false, error: "Unauthorised." }, 401);

  const store = getStore();
  const date = clinicTomorrow();
  try {
    const due = (await store.list({ from: date, clinicSlug: CLINIC_SLUG })).filter((b) => b.date === date && b.status === "confirmed");
    const reminded = new Set(
      (await store.listMessagesForBookings(due.map((b) => b.id))).filter((m) => m.kind === "reminder").map((m) => m.bookingId),
    );
    let sent = 0;
    let failed = 0;
    for (const b of due) {
      if (reminded.has(b.id)) continue;
      const row = await sendBookingMessage(b, "reminder", { store });
      if (row?.status === "sent") sent += 1;
      else failed += 1;
    }
    const skipped = due.length - sent - failed;
    console.log(`reminders: ${date}, ${due.length} confirmed, ${sent} sent, ${failed} failed, ${skipped} already reminded`);
    return json({ ok: true, date, due: due.length, sent, failed, skipped });
  } catch (err) {
    console.error(`reminders failed: ${err instanceof Error ? err.message : "unknown error"}`);
    return json({ ok: false, error: "Reminder run failed." }, 500);
  }
}
