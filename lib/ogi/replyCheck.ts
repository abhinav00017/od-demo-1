import type { OgiProfile } from "./profiles";

/**
 * Lock 5: the check every reply passes before it is sent. It does not trust the prompt. It blocks:
 *   - the name of any other onlydevs demo business,
 *   - any phone number except the business's own (the emergency line 108 is three digits, so it never looks like one),
 *   - any money amount that is not in the profile or this turn's tool results,
 *   - medicine doses (clinic rule: no medical advice).
 * A blocked reply is replaced with the safe hand-over message.
 */

/** Every demo business that is not the one on the page. Spellings as they appear across the demos. */
export const DEMO_BUSINESS_NAMES = [
  "Lotus Women's Clinic",
  "Kalyani Tiles",
  "Kalyani",
  "Solstice Roastery",
  "Solstice",
  "Verdant Crest",
  "Nilaya Developers",
  "Nilaya",
  "ShowSalsa",
  "Bean Street Cafe",
  "Banyan Heights",
  "Meridian Homes",
  "TicketWings",
  "Sky49",
] as const;

/** Letters and digits only, lower case: "Kalyani-Tiles", "SHOW salsa" and "Show Salsa" all match. */
const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Phone-like runs: 10+ digits, or 7+ digits after a "+". */
const PHONE_RUN = /\+?\d[\d\s().-]{5,}\d/g;

function phoneDigits(run: string) {
  const digits = run.replace(/\D/g, "");
  if (digits.length >= 10 || (run.trim().startsWith("+") && digits.length >= 7)) {
    // Compare the national number: drop a leading 91 or 0 from an Indian number.
    return digits.replace(/^(91|0)(?=\d{10}$)/, "");
  }
  return undefined;
}

export function findPhones(text: string) {
  return [...text.matchAll(PHONE_RUN)].map((m) => phoneDigits(m[0])).filter((d): d is string => !!d);
}

const MONEY = [
  /(?:₹|\$|€|£|\b(?:rs\.?|inr|usd))\s*(\d[\d,]*(?:\.\d+)?)/gi,
  /(\d[\d,]*(?:\.\d+)?)\s*(?:\/-|rupees?|rs\b|inr\b|dollars?|lakhs?|lacs?|crores?|cr\b|k\b)/gi,
];

const normaliseAmount = (n: string) => String(Number(n.replace(/,/g, "")));

export function findAmounts(text: string) {
  const out = new Set<string>();
  for (const re of MONEY) for (const m of text.matchAll(re)) out.add(normaliseAmount(m[1]));
  return [...out];
}

const DOSE = /\b\d+(?:\.\d+)?\s?(?:mg|mcg|µg|ml|iu|units?|tablets?|tabs?|capsules?|pills?)\b/i;

export type ReplyCheck = { ok: true } | { ok: false; reasons: ("business_name" | "phone" | "money" | "dose")[] };

export function checkReply(text: string, { profile, toolResults = [] }: { profile: OgiProfile; toolResults?: string[] }): ReplyCheck {
  const reasons = new Set<"business_name" | "phone" | "money" | "dose">();
  const flat = squash(text);
  const own = squash(profile.businessName);
  for (const name of DEMO_BUSINESS_NAMES) {
    const n = squash(name);
    if (own.includes(n) || n.includes(own)) continue;
    if (flat.includes(n)) reasons.add("business_name");
  }

  const ownPhone = phoneDigits(profile.contact.phone);
  for (const p of findPhones(text)) if (p !== ownPhone) reasons.add("phone");

  const known = new Set(findAmounts([JSON.stringify(profile.facts), ...toolResults].join(" ")));
  for (const a of findAmounts(text)) if (!known.has(a)) reasons.add("money");

  if (profile.kind === "clinic" && DOSE.test(text)) reasons.add("dose");

  return reasons.size ? { ok: false, reasons: [...reasons] } : { ok: true };
}

/** What the visitor sees instead of a blocked reply. */
export function safeHandOver(profile: OgiProfile) {
  return `Sorry, I can't help with that here. Please call or WhatsApp the ${profile.businessName} team on ${profile.contact.phone}. They'll be glad to help.`;
}
