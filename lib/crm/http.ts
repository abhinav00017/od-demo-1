import type { NextRequest } from "next/server";
import type { z } from "zod";
import { CRM_AUTH, isAuthed } from "@/lib/admin/auth";
import { json } from "@/lib/bookings/http";
import { getCrmStore } from "./index";
import { DEFAULT_SHOP, type Shop } from "./shop";
import type { CrmStore } from "./types";
import { fieldErrors } from "./validation";

export { json };

export const NOT_LOGGED_IN = { ok: false, error: "Log in to the CRM first." };

export function isCrmRequest(req: NextRequest) {
  return isAuthed(CRM_AUTH, req.cookies.get(CRM_AUTH.cookie)?.value);
}

/** The request body checked against a schema. Bad JSON and bad fields both answer 400 with field errors. */
export async function parseBody<S extends z.ZodType>(req: NextRequest, schema: S): Promise<{ ok: true; data: z.output<S> } | { ok: false; res: Response }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false, res: json({ ok: false, error: "Send the request as JSON." }, 400) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    return { ok: false, res: json({ ok: false, error: Object.values(errors)[0] ?? "Please check the form.", fieldErrors: errors }, 400) };
  }
  return { ok: true, data: parsed.data };
}

type Ctx = { store: CrmStore; shop: Shop };

/**
 * Runs a CRM handler: the login check first, then the store, then the handler. A thrown error answers 500
 * with one log line naming the route, never the request's data.
 */
export async function crm(req: NextRequest, label: string, handler: (ctx: Ctx) => Promise<Response>): Promise<Response> {
  if (!isCrmRequest(req)) return json(NOT_LOGGED_IN, 401);
  try {
    return await handler({ store: await getCrmStore(), shop: DEFAULT_SHOP });
  } catch (err) {
    console.error(`crm ${label} failed: ${err instanceof Error ? err.message : "unknown error"}`);
    return json({ ok: false, error: "Something went wrong. Try again." }, 500);
  }
}

export const notFound = (what: string) => json({ ok: false, error: `No ${what} with that id.` }, 404);
