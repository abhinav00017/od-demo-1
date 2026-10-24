import type { NextRequest } from "next/server";
import { crm, json, parseBody } from "@/lib/crm/http";
import { DuplicateError, LEAD_STATUSES, type LeadStatus } from "@/lib/crm/types";
import { leadCreateBody } from "@/lib/crm/validation";

/** Leads, newest first, each with its quote count and latest quote. ?q= searches name and phone; ?status= filters. */
export async function GET(req: NextRequest) {
  return crm(req, "leads list", async ({ store, shop }) => {
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    const status = req.nextUrl.searchParams.get("status");
    const [leads, quotes] = await Promise.all([store.listLeads(shop.slug), store.listQuotes(shop.slug)]);
    const counts = { all: leads.length, lead: 0, customer: 0, lost: 0 } as Record<"all" | LeadStatus, number>;
    for (const l of leads) counts[l.status] += 1;
    const rows = leads
      .filter((l) => !status || !(LEAD_STATUSES as readonly string[]).includes(status) || l.status === status)
      .filter((l) => !q || l.name.toLowerCase().includes(q) || (digits.length >= 3 && l.phone.includes(digits)))
      .map((l) => {
        const own = quotes.filter((x) => x.leadId === l.id);
        const latest = own[0];
        return { ...l, quoteCount: own.length, latestQuote: latest ? { id: latest.id, number: latest.number, status: latest.status, total: latest.total } : null };
      });
    return json({ ok: true, leads: rows, counts });
  });
}

/** New lead. 409 with the existing lead's id when the number is already in the shop. */
export async function POST(req: NextRequest) {
  return crm(req, "lead create", async ({ store, shop }) => {
    const body = await parseBody(req, leadCreateBody);
    if (!body.ok) return body.res;
    try {
      const lead = await store.createLead(shop.slug, body.data);
      return json({ ok: true, lead }, 201);
    } catch (err) {
      if (err instanceof DuplicateError) {
        const existing = err.existingId ? await store.getLead(shop.slug, err.existingId) : null;
        return json(
          {
            ok: false,
            error: existing ? `This number is already saved for ${existing.name}.` : "This number is already saved.",
            fieldErrors: { phone: "This number is already saved." },
            existingId: existing?.id ?? null,
          },
          409,
        );
      }
      throw err;
    }
  });
}
