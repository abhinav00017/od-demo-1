import type { NextRequest } from "next/server";
import type { PublicSource } from "@/lib/bookings/sources";
import { json, owner } from "@/lib/cafeEvents/http";
import { indiaToday } from "@/lib/cafeEvents/validation";

/**
 * Every enquiry for the cafe, newest first, with today in India so the list can mark past dates. Owner only.
 * `sources` counts enquiries per first-touch source and `viaOgi` how many came through Ogi, like the clinic
 * dashboard's "Bookings by source".
 */
export async function GET(req: NextRequest) {
  return owner(req, "enquiry list", async ({ store, cafeSlug }) => {
    const enquiries = await store.list(cafeSlug);
    const sources: Partial<Record<PublicSource, number>> = {};
    for (const e of enquiries) sources[e.source] = (sources[e.source] ?? 0) + 1;
    const viaOgi = enquiries.filter((e) => e.channel === "ogi").length;
    return json({ ok: true, today: indiaToday(), storage: store.kind, enquiries, sources, viaOgi });
  });
}
