import type { NextRequest } from "next/server";
import { authConfig, CAFE_AUTH } from "@/lib/admin/auth";
import { json } from "@/lib/bookings/http";
import { isCafeOwner } from "@/lib/cafeEvents/http";

/** Tells the owner page what to show: not configured, the login form, or the list. */
export async function GET(req: NextRequest) {
  const config = authConfig(CAFE_AUTH);
  return json({ configured: config.configured, devPassword: config.configured && config.devFallback, authed: isCafeOwner(req) });
}
