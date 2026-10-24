import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** A login lasts 12 hours. */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
/** Password accepted in `next dev` when the password env var is missing. Never in production. */
export const DEV_PASSWORD = "demo";

type Env = Record<string, string | undefined>;

/**
 * One password-protected area: its cookie, the word signed into the cookie, and the env vars it reads.
 * The scope keeps a cookie from one area from opening another, even when both run on the "demo" password.
 */
export type AuthArea = { cookie: string; scope: string; passwordVar: string; secretVar: string };

/** The Lotus clinic dashboard. Scope "admin" keeps cookies signed before the CRM build valid. */
export const LOTUS_AUTH: AuthArea = { cookie: "lotus_admin", scope: "admin", passwordVar: "ADMIN_PASSWORD", secretVar: "ADMIN_SECRET" };
/** The tile showroom CRM. */
export const CRM_AUTH: AuthArea = { cookie: "crm_session", scope: "crm", passwordVar: "CRM_ADMIN_PASSWORD", secretVar: "CRM_ADMIN_SECRET" };

export const ADMIN_COOKIE = LOTUS_AUTH.cookie;

export type AdminConfig =
  | { configured: false }
  | { configured: true; password: string; secret: string; devFallback: boolean };

/**
 * The area's password env var turns it on. Its secret var signs the cookie; it falls back to the password.
 * Without the password, development accepts "demo" and production stays off.
 */
export function authConfig(area: AuthArea, env: Env = process.env): AdminConfig {
  const password = env[area.passwordVar];
  const secret = env[area.secretVar];
  if (password) return { configured: true, password, secret: secret || password, devFallback: false };
  if (env.NODE_ENV === "development") return { configured: true, password: DEV_PASSWORD, secret: secret || DEV_PASSWORD, devFallback: true };
  return { configured: false };
}

/** The Lotus dashboard config: ADMIN_PASSWORD and ADMIN_SECRET. */
export function adminConfig(env: Env = process.env): AdminConfig {
  return authConfig(LOTUS_AUTH, env);
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

/** Cookie value: "<scope>.<expiry ms>.<HMAC of both>". */
export function signSession(secret: string, now = Date.now(), ttlMs = SESSION_TTL_MS, scope = LOTUS_AUTH.scope) {
  const payload = `${scope}.${now + ttlMs}`;
  return `${payload}.${hmac(secret, payload)}`;
}

export function verifySession(token: string | undefined, secret: string, now = Date.now(), scope = LOTUS_AUTH.scope) {
  if (!token) return false;
  const cut = token.lastIndexOf(".");
  if (cut < 0) return false;
  const payload = token.slice(0, cut);
  const sig = token.slice(cut + 1);
  const m = /^([a-z]+)\.(\d+)$/.exec(payload);
  if (!m || m[1] !== scope || !sameText(sig, hmac(secret, payload))) return false;
  return Number(m[2]) > now;
}

/** True when the cookie is a valid, unexpired session for this area and the area is configured. */
export function isAuthed(area: AuthArea, cookieValue: string | undefined, env: Env = process.env, now = Date.now()) {
  const config = authConfig(area, env);
  return config.configured && verifySession(cookieValue, config.secret, now, area.scope);
}

/** True when the request carries a valid Lotus admin cookie and the dashboard is configured. */
export function isAdminRequest(cookieValue: string | undefined, env: Env = process.env, now = Date.now()) {
  return isAuthed(LOTUS_AUTH, cookieValue, env, now);
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
