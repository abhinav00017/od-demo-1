/**
 * Patient replies on WhatsApp, as Twilio posts them to /api/whatsapp/twilio-inbound.
 * A "Confirm" tap confirms the booking. A "Change time" tap flags it and sends the booking link.
 * Anything else gets one polite auto-reply per sender per hour.
 * Replies go back as TwiML, inside the session the patient just opened.
 */
import { clinic } from "@/demos/lotus-clinic/data";
import { normalisePhone, shortBookingId } from "@/demos/lotus-clinic/booking";
import { clinicToday } from "@/lib/bookings/clinicDay";
import type { Booking, BookingStore } from "@/lib/bookings/types";
import { maskNumber } from "./client";
import { shortDate } from "./messages";

export const TWILIO_INBOUND_PATH = "/api/whatsapp/twilio-inbound";

export type Intent = "CONFIRM" | "CHANGE" | "OTHER";

const CONFIRM_WORDS = new Set(["confirm", "c", "yes"]);
const CHANGE_WORDS = new Set(["change time", "change", "r", "reschedule"]);

/** "  Change_Time " -> "change time". Button ids may use _ or - for spaces. */
function clean(text: string | null | undefined) {
  return (text ?? "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

/** The button payload wins, then the button text, then the typed body. */
export function inboundIntent(params: URLSearchParams): Intent {
  for (const field of ["ButtonPayload", "ButtonText", "Body"]) {
    const word = clean(params.get(field));
    if (!word) continue;
    if (CONFIRM_WORDS.has(word)) return "CONFIRM";
    if (CHANGE_WORDS.has(word)) return "CHANGE";
    // A button was tapped but did not match: do not fall through to the body.
    if (field !== "Body") return "OTHER";
  }
  return "OTHER";
}

/** "whatsapp:+919876543210" -> "9876543210". Undefined for anything that is not an Indian mobile. */
export function senderPhone(from: string | null | undefined): string | undefined {
  return normalisePhone((from ?? "").replace(/^whatsapp:/i, "").trim());
}

/** "whatsapp:+919876543210" -> "••••3210". The only form of the sender that reaches logs or the database. */
export function maskedSender(from: string | null | undefined) {
  return maskNumber((from ?? "").replace(/^whatsapp:/i, ""));
}

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** TwiML that sends one message back, or nothing. */
export function twiml(message?: string) {
  const body = message ? `<Message>${escapeXml(message)}</Message>` : "";
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`;
}

const origin = (publicUrl: string) => publicUrl.replace(/\/+$/, "");

export function confirmReply(b: Booking) {
  return `Thank you. Your visit is confirmed for ${shortDate(b.date)}, ${b.slot}. ${clinic.name}.`;
}

export function changeReply(b: Booking, publicUrl: string) {
  return `No problem. Pick a new time here: ${origin(publicUrl)}/clinic/website/book?type=${encodeURIComponent(b.visitType)} and we will confirm on WhatsApp.`;
}

export function otherReply(publicUrl: string) {
  return `Thanks for your message. For bookings use ${origin(publicUrl)}/clinic/website/book or call ${clinic.phone}.`;
}

// Last auto-reply time per sender. In memory, so it resets on a cold start; good enough to stop reply loops.
const g = globalThis as typeof globalThis & { __lotusInboundReplies?: Map<string, number> };
const replied = () => (g.__lotusInboundReplies ??= new Map());
export const OTHER_REPLY_EVERY_MS = 60 * 60 * 1000;

/** True when this sender may get the auto-reply now, and records it. */
function mayAutoReply(sender: string, now: number) {
  const last = replied().get(sender);
  if (last !== undefined && now - last < OTHER_REPLY_EVERY_MS) return false;
  replied().set(sender, now);
  return true;
}

/** Tests only. */
export function resetInboundReplies() {
  replied().clear();
}

export type InboundResult = { intent: Intent; bookingId: string | null; reply: string | null; xml: string };

/**
 * Works out the intent, finds the sender's open booking, applies it and builds the TwiML reply.
 * Store errors in logging never block the reply. Logs one line, with the last 4 digits only and no message text.
 */
export async function handleInbound(
  params: URLSearchParams,
  opts: { store: BookingStore; publicUrl: string; now?: Date },
): Promise<InboundResult> {
  const { store, publicUrl } = opts;
  const now = opts.now ?? new Date();
  const from = params.get("From");
  const masked = maskedSender(from);
  const phone = senderPhone(from);
  const intent = inboundIntent(params);

  const booking = phone ? await store.findLatestByPhone(phone, clinicToday(now)) : null;

  const log = async (kind: "inbound" | "patient_confirmed", template: string) => {
    if (!booking) return;
    try {
      await store.logMessage({ bookingId: booking.id, kind, provider: "twilio", toMasked: masked, template, status: "delivered" });
    } catch (err) {
      console.error(`twilio inbound: ${kind} not logged: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  };
  await log("inbound", intent);

  let reply: string | null = null;
  if (booking && intent === "CONFIRM") {
    // The store directly, not the dashboard's PATCH: the patient already has the confirmation template.
    const updated = (await store.updateStatus(booking.id, "confirmed")) ?? booking;
    await log("patient_confirmed", "patient_confirmed");
    reply = confirmReply(updated);
  } else if (booking && intent === "CHANGE") {
    await store.setWantsNewTime(booking.id, true);
    reply = changeReply(booking, publicUrl);
  } else if (mayAutoReply(phone ?? from ?? "unknown", now.getTime())) {
    reply = otherReply(publicUrl);
  }

  console.log(`twilio inbound: ${intent} from ${masked}, booking ${booking ? shortBookingId(booking.id) : "none"}${reply ? "" : ", no reply"}`);
  return { intent, bookingId: booking?.id ?? null, reply, xml: twiml(reply ?? undefined) };
}
