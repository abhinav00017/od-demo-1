import type { NextRequest } from "next/server";
import { crm, json } from "@/lib/crm/http";
import { dueToday, recentActivity, todayCounts } from "@/lib/crm/service";
import { shopDay } from "@/lib/crm/time";

/** The Today screen: counts, call follow-ups due today (and overdue), and recent activity. */
export async function GET(req: NextRequest) {
  return crm(req, "today", async ({ store, shop }) => {
    const now = new Date();
    const [leads, quotes, followups, messages] = await Promise.all([
      store.listLeads(shop.slug),
      store.listQuotes(shop.slug),
      store.listFollowups(shop.slug),
      store.listMessages(shop.slug),
    ]);
    const open = followups.filter((f) => !f.doneAt);
    const latestQuote = new Map<string, (typeof quotes)[number]>();
    for (const q of quotes) if (!latestQuote.has(q.leadId)) latestQuote.set(q.leadId, q);
    const due = dueToday(open, leads, now).map((f) => {
      const q = latestQuote.get(f.leadId);
      return { ...f, quote: q ? { id: q.id, number: q.number, status: q.status, total: q.total } : null };
    });
    return json({
      ok: true,
      today: shopDay(now),
      storage: store.kind,
      counts: todayCounts(leads, quotes, open, now),
      due,
      activity: recentActivity(leads, quotes, followups, messages),
    });
  });
}
