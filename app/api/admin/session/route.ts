import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, adminConfig, isAdminRequest } from "@/lib/admin/auth";
import { getStore } from "@/lib/bookings";
import { json } from "@/lib/bookings/http";

/** Tells the dashboard what to show: not configured, the login form, or the bookings. */
export async function GET(req: NextRequest) {
  const authed = isAdminRequest(req.cookies.get(ADMIN_COOKIE)?.value);
  const config = adminConfig();
  return json({
    configured: config.configured,
    devPassword: config.configured && config.devFallback,
    authed,
    storage: authed ? getStore().kind : undefined,
  });
}
