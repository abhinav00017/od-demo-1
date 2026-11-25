import type { NextRequest } from "next/server";
import { CAFE_AUTH, isAuthed } from "@/lib/admin/auth";
import { json } from "@/lib/bookings/http";
import { CAFE_SLUG, getEnquiryStore, type EnquiryStore } from "./index";

export { json };

export const NOT_LOGGED_IN = { ok: false, error: "Log in to see event enquiries." };

/** True only for a valid cafe_session cookie. A clinic or CRM cookie never counts: the scope differs. */
export function isCafeOwner(req: NextRequest) {
  return isAuthed(CAFE_AUTH, req.cookies.get(CAFE_AUTH.cookie)?.value);
}

/**
 * Runs an owner-only handler: the login check first, then the store, then the handler. A thrown error answers 500
 * with one log line naming the route, never the request's data.
 */
export async function owner(req: NextRequest, label: string, handler: (ctx: { store: EnquiryStore; cafeSlug: string }) => Promise<Response>) {
  if (!isCafeOwner(req)) return json(NOT_LOGGED_IN, 401);
  try {
    return await handler({ store: getEnquiryStore(), cafeSlug: CAFE_SLUG });
  } catch (err) {
    console.error(`cafe ${label} failed: ${err instanceof Error ? err.message : "unknown error"}`);
    return json({ ok: false, error: "Something went wrong. Try again." }, 500);
  }
}
