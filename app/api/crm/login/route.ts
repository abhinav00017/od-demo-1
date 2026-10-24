import type { NextRequest } from "next/server";
import { authConfig, checkPassword, CRM_AUTH, sessionCookieOptions, signSession } from "@/lib/admin/auth";
import { json } from "@/lib/bookings/http";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/** Checks the CRM password (CRM_ADMIN_PASSWORD) and sets the signed, httpOnly crm_session cookie. */
export async function POST(req: NextRequest) {
  if (!rateLimit(`crm-login:${clientIp(req.headers)}`)) {
    return json({ ok: false, error: "Too many attempts. Please wait a minute and try again." }, 429);
  }
  const config = authConfig(CRM_AUTH);
  if (!config.configured) return json({ ok: false, error: "CRM not configured." }, 503);

  let password: unknown;
  try {
    password = ((await req.json()) as { password?: unknown })?.password;
  } catch {
    password = undefined;
  }
  if (!checkPassword(password, config.password)) return json({ ok: false, error: "Wrong password." }, 401);

  const res = json({ ok: true });
  res.cookies.set(CRM_AUTH.cookie, signSession(config.secret, Date.now(), undefined, CRM_AUTH.scope), sessionCookieOptions());
  return res;
}
