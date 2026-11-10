import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, isAdminRequest } from "@/lib/admin/auth";

/** True when the request carries a valid clinic dashboard cookie. */
export function isAdmin(req: NextRequest) {
  return isAdminRequest(req.cookies.get(ADMIN_COOKIE)?.value);
}

/** Reads a JSON body. Undefined when the body is not JSON. */
export async function readJson(req: NextRequest): Promise<Record<string, unknown> | undefined> {
  try {
    const body = (await req.json()) as unknown;
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return undefined;
  }
}

/** Reset demo data is on unless DEMO_RESET_DISABLED=1. */
export function demoResetEnabled(env: Record<string, string | undefined> = process.env) {
  return env.DEMO_RESET_DISABLED !== "1";
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
export const isDay = (value: unknown): value is string => typeof value === "string" && DAY.test(value);
