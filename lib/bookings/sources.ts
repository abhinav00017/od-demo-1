/**
 * Where a booking came from. Public bookings get one from the visitor's first-touch attribution
 * (UTM tags, ad click ids, referrer). Staff bookings pick one in the New booking dialog.
 * Shown on the dashboard only. Never used to decide anything else.
 */
export const BOOKING_SOURCES = [
  "website",
  "google_ads",
  "meta_ads",
  "google_maps",
  "google_search",
  "walk_in",
  "phone",
  "referral",
  "whatsapp",
  "other",
] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];

/** What the public booking form may claim. Walk-in, phone and referral are for staff only. */
export const PUBLIC_SOURCES = ["website", "google_ads", "meta_ads", "google_maps", "google_search", "whatsapp"] as const satisfies readonly BookingSource[];
export type PublicSource = (typeof PUBLIC_SOURCES)[number];

/** The choices in the staff New booking dialog, in the order shown. */
export const STAFF_SOURCES = ["walk_in", "phone", "referral", "website", "google_ads", "meta_ads", "google_maps", "other"] as const satisfies readonly BookingSource[];

export const SOURCE_LABELS: Record<BookingSource, string> = {
  website: "Website",
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
  google_maps: "Google Maps",
  google_search: "Google Search",
  walk_in: "Walk-in",
  phone: "Phone",
  referral: "Referral",
  whatsapp: "WhatsApp",
  other: "Other",
};

export function isBookingSource(value: unknown): value is BookingSource {
  return typeof value === "string" && (BOOKING_SOURCES as readonly string[]).includes(value);
}

/** First-touch details kept with a booking. Every field optional, every string length-capped by the server. */
export type Utm = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  /** The referrer's host only, like "www.google.com". Never the full URL. */
  referrer?: string;
  /** The path the visitor first landed on, without the query string. */
  landing?: string;
};

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "referrer", "landing"] as const satisfies readonly (keyof Utm)[];
