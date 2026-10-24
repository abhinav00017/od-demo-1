import { CRM_AUTH, sessionCookieOptions } from "@/lib/admin/auth";
import { json } from "@/lib/bookings/http";

/** Clears the CRM session cookie. */
export async function POST() {
  const res = json({ ok: true });
  res.cookies.set(CRM_AUTH.cookie, "", { ...sessionCookieOptions(), maxAge: 0 });
  return res;
}
