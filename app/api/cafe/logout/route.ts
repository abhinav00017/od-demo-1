import { CAFE_AUTH, sessionCookieOptions } from "@/lib/admin/auth";
import { json } from "@/lib/bookings/http";

/** Clears the cafe owner's session cookie. */
export async function POST() {
  const res = json({ ok: true });
  res.cookies.set(CAFE_AUTH.cookie, "", { ...sessionCookieOptions(), maxAge: 0 });
  return res;
}
