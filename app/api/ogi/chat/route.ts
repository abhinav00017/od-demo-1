import type { NextRequest } from "next/server";
import { clinicToday } from "@/lib/bookings";
import { json } from "@/lib/bookings/http";
import { runOgi } from "@/lib/ogi/engine";
import { getOgiModel } from "@/lib/ogi/model";
import { profileForPage } from "@/lib/ogi/profiles";
import { chatRequestSchema } from "@/lib/ogi/request";
import { isAuthed } from "@/lib/admin/auth";
import type { OgiProfile } from "@/lib/ogi/profiles";
import type { Role } from "@/lib/ogi/tools";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/** Chat messages per IP per minute. In memory per server instance (lib/rateLimit.ts), so looser across Vercel instances. */
const CHAT_LIMIT = 20;

/**
 * Lock 1: the role is decided here, on the server, from the page and the request's cookie. A visitor page is always
 * "visitor". An owner page (profile.ownerArea, e.g. the cafe owner page) is "owner" only when its own area's login
 * cookie is valid, checked on every request; anything else (no cookie, an expired one, a clinic or CRM cookie) is
 * undefined, and the route answers 401. The browser can only name the page.
 */
function roleFor(profile: OgiProfile, req: NextRequest): Role | undefined {
  if (!profile.ownerArea) return "visitor";
  return isAuthed(profile.ownerArea, req.cookies.get(profile.ownerArea.cookie)?.value) ? "owner" : undefined;
}

const NOT_LOGGED_IN = "Log in to ask Ogi about your cafe.";

const RESTING = "Ogi is resting right now. You can still call or WhatsApp the team.";

/** Is Ogi awake for this page? The bubble asks once when it opens. GET /api/ogi/chat?page=lotus-clinic */
export async function GET(req: NextRequest) {
  const profile = profileForPage(req.nextUrl.searchParams.get("page") ?? "");
  if (!profile) return json({ ok: false, error: "Unknown page." }, 400);
  if (!roleFor(profile, req)) return json({ ok: false, error: NOT_LOGGED_IN }, 401);
  const awake = getOgiModel() !== null;
  return json({ ok: true, awake, greeting: profile.greeting, examples: profile.examples ?? [], ...(awake ? {} : { message: RESTING }), contact: profile.contact });
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
  const role = roleFor(profile, req);
  if (!role) return json({ ok: false, error: NOT_LOGGED_IN }, 401);

  const model = getOgiModel();
  if (!model) return json({ ok: false, resting: true, error: RESTING, contact: profile.contact }, 503);

  const result = await runOgi({ profile, role, messages: parsed.data.messages, model, today: clinicToday() });
  return json({ ok: true, ...result });
}
