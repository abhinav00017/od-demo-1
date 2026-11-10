/**
 * Demo patients use a reserved block of made-up numbers: 90000 20000 to 90000 29999.
 * Nothing is ever sent to them, and nothing is sent for an is_demo booking either.
 * (The CRM demo uses 90000 00101 to 00106, a different block.)
 */
export const DEMO_PHONE_PREFIX = "900002";

export function isDemoPhone(phone: string) {
  return /^900002\d{4}$/.test(phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""));
}

/** What a message row's template column holds when a send was stopped because the booking is demo data. */
export const SKIPPED_DEMO = "skipped (demo)";
