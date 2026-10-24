import type { NextRequest } from "next/server";
import { checkPassword } from "@/lib/admin/auth";
import { json } from "@/lib/bookings/http";
import { getCrmStore } from "@/lib/crm";
import { runFollowups } from "@/lib/crm/service";
import { SHOPS } from "@/lib/crm/shop";

/**
 * Daily CRM follow-ups. Vercel Cron calls it at 04:00 UTC (9:30 am in India) with "Authorization: Bearer CRON_SECRET".
 * For every lead whose newest quote was sent, with no contact for 2 days and no automatic nudge in 2 days:
 * one WhatsApp reminder, and a call follow-up due today.
 */
export async function GET(req: NextRequest) {
  // Read the request first. That keeps the route dynamic, so the build never prerenders a 503.
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.log("crm followups: CRON_SECRET not set, refused");
    return json({ ok: false, error: "CRON_SECRET is not set." }, 503);
  }
  if (!checkPassword(auth, `Bearer ${secret}`)) return json({ ok: false, error: "Unauthorised." }, 401);

  try {
    const store = await getCrmStore();
    const shops = [];
    for (const shop of SHOPS) shops.push(await runFollowups(store, shop, { origin: req.nextUrl.origin }));
    for (const s of shops) console.log(`crm followups: ${s.shop}, ${s.due} due, ${s.sent} sent, ${s.failed} failed, ${s.calls} calls added`);
    return json({ ok: true, shops });
  } catch (err) {
    console.error(`crm followups failed: ${err instanceof Error ? err.message : "unknown error"}`);
    return json({ ok: false, error: "Follow-up run failed." }, 500);
  }
}
