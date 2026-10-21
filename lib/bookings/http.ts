import { NextResponse } from "next/server";

/** JSON response that no browser or CDN caches. */
export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export const NOT_LOGGED_IN = { ok: false, error: "Log in to the clinic dashboard first." };
