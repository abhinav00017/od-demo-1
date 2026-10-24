import type { NextRequest } from "next/server";
import { authConfig, CRM_AUTH } from "@/lib/admin/auth";
import { json } from "@/lib/bookings/http";
import { isCrmRequest } from "@/lib/crm/http";

/** Tells the CRM screen what to show: not configured, the login form, or the app. */
export async function GET(req: NextRequest) {
  const config = authConfig(CRM_AUTH);
  return json({ configured: config.configured, devPassword: config.configured && config.devFallback, authed: isCrmRequest(req) });
}
