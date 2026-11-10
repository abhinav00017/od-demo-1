import { UTM_KEYS, type PublicSource, type Utm } from "@/lib/bookings/sources";

/**
 * First-touch attribution for the Lotus site. On a visitor's first page load we keep where they came from
 * (UTM tags, ad click ids, the referrer's host, the landing path) in localStorage for 30 days, and the
 * booking form sends it with the booking. Display only: the dashboard shows it as a source chip.
 */
export const ATTRIBUTION_KEY = "lotus_first_touch";
export const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Longest value kept for any one field. The server caps them again. */
const MAX_LEN = 200;

export type Attribution = { source: PublicSource; campaign: string | null; utm: Utm | null };
type Stored = Attribution & { at: number };

const PAID = new Set(["cpc", "ppc", "paid", "cpm", "paid_social", "paid-social", "paidsocial", "paidsearch", "paid_search"]);
const META = new Set(["facebook", "fb", "instagram", "ig", "meta"]);

const lower = (v: string | undefined) => (v ?? "").trim().toLowerCase();

function hostOf(referrer: string) {
  try {
    return new URL(referrer).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function pathOf(referrer: string) {
  try {
    return new URL(referrer).pathname.toLowerCase();
  } catch {
    return "";
  }
}

const isGoogleHost = (host: string) => /(^|\.)google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host);

/**
 * Maps first-touch details to a source. In order: Google Ads (gclid, or utm_source google with a paid medium),
 * Meta Ads (fbclid, or utm_source facebook/instagram/meta with a paid medium), Google Maps (maps.google.* or a
 * google.* /maps referrer), Google Search (any other google.* referrer), WhatsApp (utm_source whatsapp or a
 * WhatsApp referrer), else Website. `referrer` is the full document.referrer; only its host is ever kept.
 */
export function sourceFrom(params: Utm, referrer: string): PublicSource {
  const src = lower(params.utm_source);
  const medium = lower(params.utm_medium);
  const host = hostOf(referrer) || lower(params.referrer);
  if (params.gclid || (src === "google" && PAID.has(medium))) return "google_ads";
  if (params.fbclid || (META.has(src) && PAID.has(medium))) return "meta_ads";
  if (host.startsWith("maps.google.") || (isGoogleHost(host) && pathOf(referrer).startsWith("/maps"))) return "google_maps";
  if (isGoogleHost(host)) return "google_search";
  if (src === "whatsapp" || host === "wa.me" || host.endsWith("whatsapp.com")) return "whatsapp";
  return "website";
}

/** Reads the first-touch details from a page URL and the referrer. Our own site as referrer counts as none. */
export function attributionFrom(href: string, referrer: string): Attribution {
  const url = new URL(href);
  const utm: Utm = {};
  for (const key of UTM_KEYS) {
    if (key === "referrer" || key === "landing") continue;
    const value = url.searchParams.get(key)?.trim();
    if (value) utm[key] = value.slice(0, MAX_LEN);
  }
  const host = hostOf(referrer);
  const external = host && host !== url.hostname.toLowerCase() ? referrer : "";
  if (external) utm.referrer = host.slice(0, MAX_LEN);
  utm.landing = url.pathname.slice(0, MAX_LEN);
  return { source: sourceFrom(utm, external), campaign: utm.utm_campaign ?? null, utm };
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** The stored first touch, or null when there is none, it is older than 30 days, or storage fails. */
export function readAttribution(storage: StorageLike | undefined, now = Date.now()): Attribution | null {
  try {
    const raw = storage?.getItem(ATTRIBUTION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<Stored>;
    if (typeof data.at !== "number" || now - data.at > ATTRIBUTION_TTL_MS || typeof data.source !== "string") {
      storage?.removeItem(ATTRIBUTION_KEY);
      return null;
    }
    return { source: data.source, campaign: data.campaign ?? null, utm: data.utm ?? null };
  } catch {
    return null;
  }
}

/** Keeps the first touch: writes only when nothing valid is stored. Never throws. */
export function captureFirstTouch(storage: StorageLike | undefined, href: string, referrer: string, now = Date.now()): Attribution | null {
  try {
    const kept = readAttribution(storage, now);
    if (kept) return kept;
    const fresh = attributionFrom(href, referrer);
    storage?.setItem(ATTRIBUTION_KEY, JSON.stringify({ ...fresh, at: now } satisfies Stored));
    return fresh;
  } catch {
    return null;
  }
}

/** localStorage, or undefined where it is blocked (some private windows throw on access). */
export function safeLocalStorage(): StorageLike | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}
