import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, adminConfig, checkPassword, sessionCookieOptions, signSession } from "@/lib/admin/auth";
import { json } from "@/lib/bookings/http";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/** Checks the clinic password and sets a signed, httpOnly session cookie. */
export async function POST(req: NextRequest) {
  if (!rateLimit(`login:${clientIp(req.headers)}`)) {
    return json({ ok: false, error: "Too many attempts. Please wait a minute and try again." }, 429);
  }
  const config = adminConfig();
  if (!config.configured) return json({ ok: false, error: "Dashboard not configured." }, 503);

  let password: unknown;
  try {
    password = ((await req.json()) as { password?: unknown })?.password;
  } catch {
    password = undefined;
  }
  if (!checkPassword(password, config.password)) return json({ ok: false, error: "Wrong password." }, 401);

  const res = json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, signSession(config.secret), sessionCookieOptions());
  return res;
}
