/**
 * Who may get a WhatsApp message, and what to do when a number turns out not to be on WhatsApp.
 *
 * Errors that mean "this number is not on WhatsApp", checked against the providers' docs on 10 Nov 2026:
 * - Meta 131026 "Message undeliverable" (the recipient is not a WhatsApp user, or cannot get the message).
 * - Twilio 63024 "Invalid message recipient": Meta identifies the recipient as an invalid WhatsApp user.
 *   https://www.twilio.com/docs/api/errors/63024
 * - Twilio 63003 "Channel could not find To address": the address does not belong to an active user on the channel.
 *   https://www.twilio.com/docs/api/errors/63003
 */
import { shortBookingId } from "@/demos/lotus-clinic/booking";
import type { Booking, BookingStore, MessageLog, MessageProvider, SkipReason } from "@/lib/bookings/types";
import { isDemoPhone } from "@/lib/bookings/demoPhones";

export const NO_WHATSAPP_CODES: Record<Exclude<MessageProvider, "fake">, readonly string[]> = {
  meta: ["131026"],
  twilio: ["63024", "63003"],
};

/** The code at the front of a stored error, like "63024" from "63024: Invalid message recipient". */
export function errorCode(error: string | null | undefined): string | null {
  return /^\s*(\d{3,6})\b/.exec(error ?? "")?.[1] ?? null;
}

/** True when a provider's error code means the number is not on WhatsApp. A fake provider never says so. */
export function isNoWhatsAppError(provider: MessageProvider, codeOrError: string | number | null | undefined) {
  if (provider === "fake" || codeOrError === null || codeOrError === undefined) return false;
  const code = typeof codeOrError === "number" ? String(codeOrError) : (errorCode(codeOrError) ?? codeOrError.trim());
  return NO_WHATSAPP_CODES[provider].includes(code);
}

/**
 * Why a patient message must not go out, checked in this order: the phone opted out, there is no consent,
 * the booking or the phone is marked not on WhatsApp, the booking is demo data. Null = send.
 * A failed opt-out lookup counts as opted out: better a missed message than one the patient refused.
 */
export async function blockReason(store: BookingStore, b: Booking): Promise<SkipReason | null> {
  let blocks: { optedOut: string[]; unreachable: string[] };
  try {
    blocks = await store.whatsappBlocks([b.phone]);
  } catch (err) {
    console.error(`whatsapp: opt-out lookup failed for booking ${shortBookingId(b.id)}: ${err instanceof Error ? err.message : "unknown error"}`);
    return "opted out";
  }
  if (blocks.optedOut.includes(b.phone)) return "opted out";
  if (!b.consentSource) return "no consent";
  if (b.noWhatsApp || blocks.unreachable.includes(b.phone)) return "no WhatsApp";
  if (b.isDemo || isDemoPhone(b.phone)) return "demo";
  return null;
}

/** True when the patient can be asked something on WhatsApp now (used to decide "Waiting for patient"). Demo bookings count as reachable. */
export async function canMessage(store: BookingStore, b: Booking) {
  const reason = await blockReason(store, b);
  return reason === null || reason === "demo";
}

/**
 * A send or a status callback said the number is not on WhatsApp: marks the booking No WhatsApp and remembers the phone,
 * so later bookings skip WhatsApp. Only for patient messages: a failed clinic alert says nothing about the patient. Never throws.
 */
export async function markNoWhatsApp(store: BookingStore, row: Pick<MessageLog, "bookingId" | "kind" | "error">) {
  if (!row.bookingId || row.kind === "clinic_alert") return;
  try {
    const b = await store.setNoWhatsApp(row.bookingId, true);
    if (!b) return;
    await store.markUnreachable(b.phone, errorCode(row.error) ?? "not on WhatsApp");
    console.log(`whatsapp: booking ${shortBookingId(b.id)} marked No WhatsApp (${errorCode(row.error) ?? "error"})`);
  } catch (err) {
    console.error(`whatsapp: No WhatsApp mark failed: ${err instanceof Error ? err.message : "unknown error"}`);
  }
}
