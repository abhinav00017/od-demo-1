import { ADMIN_COOKIE, sessionCookieOptions } from "@/lib/admin/auth";
import { json } from "@/lib/bookings/http";

/** Clears the session cookie. */
export async function POST() {
  const res = json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return res;
}
