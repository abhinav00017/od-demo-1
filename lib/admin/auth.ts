import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "lotus_admin";
/** A login lasts 12 hours. */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
/** Password accepted in `next dev` when ADMIN_PASSWORD is missing. Never in production. */
export const DEV_PASSWORD = "demo";

type Env = Record<string, string | undefined>;

export type AdminConfig =
  | { configured: false }
  | { configured: true; password: string; secret: string; devFallback: boolean };

/**
 * ADMIN_PASSWORD turns the dashboard on. ADMIN_SECRET signs the cookie; it falls back to the password.
 * Without ADMIN_PASSWORD, development accepts "demo" and production stays off.
 */
export function adminConfig(env: Env = process.env): AdminConfig {
  const password = env.ADMIN_PASSWORD;
  if (password) return { configured: true, password, secret: env.ADMIN_SECRET || password, devFallback: false };
  if (env.NODE_ENV === "development") return { configured: true, password: DEV_PASSWORD, secret: env.ADMIN_SECRET || DEV_PASSWORD, devFallback: true };
  return { configured: false };
}

function hmac(secret: string, value: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function sameText(a: string, b: string) {
  // Hash first so both buffers have the same length and the compare takes the same time.
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkPassword(given: unknown, expected: string) {
  return typeof given === "string" && given.length > 0 && sameText(given, expected);
}

/** Cookie value: "<expiry ms>.<HMAC of the expiry>". */
export function signSession(secret: string, now = Date.now(), ttlMs = SESSION_TTL_MS) {
  const payload = `admin.${now + ttlMs}`;
  return `${payload}.${hmac(secret, payload)}`;
}

export function verifySession(token: string | undefined, secret: string, now = Date.now()) {
  if (!token) return false;
  const cut = token.lastIndexOf(".");
  if (cut < 0) return false;
  const payload = token.slice(0, cut);
  const sig = token.slice(cut + 1);
  const m = /^admin\.(\d+)$/.exec(payload);
  if (!m || !sameText(sig, hmac(secret, payload))) return false;
  return Number(m[1]) > now;
}

/** True when the request carries a valid admin cookie and the dashboard is configured. */
export function isAdminRequest(cookieValue: string | undefined, env: Env = process.env, now = Date.now()) {
  const config = adminConfig(env);
  return config.configured && verifySession(cookieValue, config.secret, now);
}

export function sessionCookieOptions(env: Env = process.env) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  };
}
