import { createHmac, timingSafeEqual } from "node:crypto";
import type { MessageStatus } from "@/lib/bookings/types";
import { scrubDigits } from "./client";

/**
 * Twilio's request signature: HMAC-SHA1, keyed with the auth token, of the full URL Twilio called
 * followed by every POST param name and value, params sorted by name. Base64.
 * https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
export function twilioSignature(authToken: string, url: string, params: URLSearchParams) {
  const pairs = [...params.entries()].sort(([a, av], [b, bv]) => (a === b ? (av < bv ? -1 : av > bv ? 1 : 0) : a < b ? -1 : 1));
  const data = url + pairs.map(([k, v]) => k + v).join("");
  return createHmac("sha1", authToken).update(data, "utf8").digest("base64");
}

/** True when the X-Twilio-Signature header matches one of the URLs Twilio may have signed. */
export function validTwilioSignature(authToken: string, header: string | null, urls: string[], params: URLSearchParams) {
  if (!header) return false;
  const given = Buffer.from(header);
  return urls.some((url) => {
    const wanted = Buffer.from(twilioSignature(authToken, url, params));
    return given.length === wanted.length && timingSafeEqual(given, wanted);
  });
}

/** Twilio's MessageStatus -> ours. Null for anything we do not track (like "receiving"). */
export function mapTwilioStatus(status: string | null): MessageStatus | null {
  switch ((status ?? "").toLowerCase()) {
    case "accepted":
    case "scheduled":
    case "queued":
    case "sending":
      return "queued";
    case "sent":
      return "sent";
    case "delivered":
      return "delivered";
    case "read":
      return "read";
    case "failed":
    case "undelivered":
      return "failed";
    default:
      return null;
  }
}

/** A failed callback's reason as a short line with no phone numbers, like "63016: Outside the allowed window". */
export function twilioStatusError(params: URLSearchParams) {
  const code = params.get("ErrorCode");
  const text = params.get("ErrorMessage") || params.get("MessageStatus") || "failed";
  return scrubDigits(`${code ? `${code}: ` : ""}${text}`).slice(0, 160);
}
