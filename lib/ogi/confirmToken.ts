import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { clinic } from "@/demos/lotus-clinic/data";
import { MAX_NAME } from "@/demos/lotus-clinic/booking";

/**
 * The signed Confirm token. Ogi's request_visit tool never books: it only signs the visit details the visitor gave.
 * The browser shows them with a Confirm button, and only that click (POST /api/ogi/confirm) creates the booking,
 * through the same service the booking form uses. The model never sees this token.
 *
 * Format: base64url(JSON payload) + "." + base64url(HMAC-SHA256). Valid for 15 minutes, once.
 */
export const CONFIRM_TTL_MS = 15 * 60 * 1000;

export const pendingVisitSchema = z.strictObject({
  name: z.string().min(2).max(MAX_NAME),
  phone: z.string().min(10).max(20),
  visitType: z.enum(clinic.booking.visitTypes.map((t) => t.id) as [string, ...string[]]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.enum(clinic.booking.slots),
  reason: z.enum(clinic.booking.reasons),
});
export type PendingVisit = z.infer<typeof pendingVisitSchema>;

const payloadSchema = z.strictObject({
  v: z.literal(1),
  page: z.string().max(64),
  visit: pendingVisitSchema,
  exp: z.number().int(),
  nonce: z.string().min(16).max(64),
});
type Payload = z.infer<typeof payloadSchema>;

type Env = Record<string, string | undefined>;

/**
 * The signing secret: OGI_CONFIRM_SECRET, else the clinic admin secret (ADMIN_SECRET, then ADMIN_PASSWORD), which
 * production already has. Outside production a fixed dev value. Production with none of them = chat booking is off.
 * The key is derived with a label, so an admin cookie and a Confirm token can never stand in for each other.
 */
function signingKey(env: Env = process.env): Buffer | undefined {
  const secret = env.OGI_CONFIRM_SECRET || env.ADMIN_SECRET || env.ADMIN_PASSWORD || (env.NODE_ENV !== "production" ? "ogi-dev-only-secret" : "");
  if (!secret) return undefined;
  return createHmac("sha256", secret).update("ogi-confirm-v1").digest();
}

export function confirmAvailable(env: Env = process.env) {
  return signingKey(env) !== undefined;
}

function sign(key: Buffer, body: string) {
  return createHmac("sha256", key).update(body).digest("base64url");
}

export function signConfirm(page: string, visit: PendingVisit, { now = Date.now(), env }: { now?: number; env?: Env } = {}) {
  const key = signingKey(env);
  if (!key) return undefined;
  const payload: Payload = { v: 1, page, visit, exp: now + CONFIRM_TTL_MS, nonce: randomBytes(16).toString("base64url") };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { token: `${body}.${sign(key, body)}`, expiresAt: payload.exp };
}

export type VerifyResult = { ok: true; payload: Payload } | { ok: false; reason: "invalid" | "expired" };

/** Checks the signature first, then the shape, then the expiry. A forged or edited token is "invalid". */
export function verifyConfirm(token: string, { now = Date.now(), env }: { now?: number; env?: Env } = {}): VerifyResult {
  const key = signingKey(env);
  if (!key || typeof token !== "string" || token.length > 4000) return { ok: false, reason: "invalid" };
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: "invalid" };
  const expected = Buffer.from(sign(key, parts[0]));
  const given = Buffer.from(parts[1]);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: "invalid" };
  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "invalid" };
  }
  const parsed = payloadSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  if (parsed.data.exp <= now) return { ok: false, reason: "expired" };
  return { ok: true, payload: parsed.data };
}

/**
 * Used nonces, so one token books once. Kept in memory per server instance: on Vercel two instances could each
 * accept the same token once within its 15 minutes. Good enough for a demo; a real client gets a database table.
 */
const g = globalThis as typeof globalThis & { __ogiUsedNonces?: Map<string, number> };
function used() {
  g.__ogiUsedNonces ??= new Map();
  return g.__ogiUsedNonces;
}

/** Claims a nonce. False when it was already claimed. */
export function claimNonce(nonce: string, exp: number, now = Date.now()) {
  const map = used();
  if (map.size > 5000) for (const [k, v] of map) if (v <= now) map.delete(k);
  if (map.has(nonce)) return false;
  map.set(nonce, exp);
  return true;
}

/** Gives a nonce back when the booking did not save, so the visitor can try again. */
export function releaseNonce(nonce: string) {
  used().delete(nonce);
}

/** Tests only. */
export function resetUsedNonces() {
  used().clear();
}
