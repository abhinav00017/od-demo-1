import type { NextRequest } from "next/server";
import { clinicToday } from "@/lib/bookings";
import { json } from "@/lib/bookings/http";
import { runOgi } from "@/lib/ogi/engine";
import { getOgiModel } from "@/lib/ogi/model";
import { profileForPage } from "@/lib/ogi/profiles";
import { chatRequestSchema } from "@/lib/ogi/request";
import type { Role } from "@/lib/ogi/tools";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/** Chat messages per IP per minute. In memory per server instance (lib/rateLimit.ts), so looser across Vercel instances. */
const CHAT_LIMIT = 20;

/** Lock 1: the role is decided here, on the server. v1 has no owner mode, so it is always "visitor". */
const ROLE: Role = "visitor";

const RESTING = "Ogi is resting right now. You can still call or WhatsApp the clinic.";

/** Is Ogi awake for this page? The bubble asks once when it opens. GET /api/ogi/chat?page=lotus-clinic */
export async function GET(req: NextRequest) {
  const profile = profileForPage(req.nextUrl.searchParams.get("page") ?? "");
  if (!profile) return json({ ok: false, error: "Unknown page." }, 400);
  const awake = getOgiModel() !== null;
  return json({ ok: true, awake, greeting: profile.greeting, ...(awake ? {} : { message: RESTING }), contact: profile.contact });
}

/** One chat turn: `{ page, messages }` in, `{ reply, confirm? }` out. */
export async function POST(req: NextRequest) {
  if (!rateLimit(`ogi:${clientIp(req.headers)}`, { limit: CHAT_LIMIT })) {
    return json({ ok: false, error: "Too many messages. Please wait a minute and try again." }, 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Send the chat as JSON." }, 400);
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) return json({ ok: false, error: "That message could not be read." }, 400);

  const profile = profileForPage(parsed.data.page);
  if (!profile) return json({ ok: false, error: "Unknown page." }, 400);

  const model = getOgiModel();
  if (!model) return json({ ok: false, resting: true, error: RESTING, contact: profile.contact }, 503);

  const result = await runOgi({ profile, role: ROLE, messages: parsed.data.messages, model, today: clinicToday() });
  return json({ ok: true, ...result });
}
