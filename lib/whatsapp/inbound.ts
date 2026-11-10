/**
 * Patient replies on WhatsApp, as Twilio posts them to /api/whatsapp/twilio-inbound.
 * STOP (and Twilio's other opt-out words) opts the number out of every message; START opts it back in.
 * "Cancel" is not an opt-out here: with an upcoming booking it gets that booking's patient page, where the visit is cancelled or changed.
 * Confirm and Change only mean something for a booking staff moved (awaiting_patient): Confirm clears the wait
 * and thanks the patient; Change sends the patient's own page. Anything else gets one polite auto-reply per sender per hour.
 * Replies go back as TwiML, inside the session the patient just opened.
 */
import { clinic } from "@/demos/lotus-clinic/data";
import { normalisePhone, shortBookingId } from "@/demos/lotus-clinic/booking";
import { clinicToday } from "@/lib/bookings/clinicDay";
import type { Booking, BookingStore } from "@/lib/bookings/types";
import { patientPageUrl } from "@/lib/bookings/viewToken";
import { maskNumber } from "./client";
import { replies } from "./texts";

export const TWILIO_INBOUND_PATH = "/api/whatsapp/twilio-inbound";

export type Intent = "CONFIRM" | "CHANGE" | "CANCEL" | "STOP" | "START" | "OTHER";

const CONFIRM_WORDS = new Set(["confirm", "c", "yes"]);
const CHANGE_WORDS = new Set(["change", "change time", "r", "reschedule"]);
const CANCEL_WORDS = new Set(["cancel"]);
/**
 * Twilio's default opt-out keywords (STOP, STOPALL, UNSUBSCRIBE, END, QUIT, and since May 2025 REVOKE and OPTOUT),
 * plus "opt out". CANCEL is left out on purpose: a patient typing "cancel" means the visit, not the messages.
 * https://support.twilio.com/hc/en-us/articles/223134027
 */
export const STOP_WORDS = new Set(["stop", "stopall", "unsubscribe", "end", "quit", "revoke", "optout", "opt out"]);
/** Twilio's opt-in keywords, START and UNSTOP. YES stays a Confirm here. */
export const START_WORDS = new Set(["start", "unstop"]);

/** "  Change_Time " -> "change time". Button ids may use _ or - for spaces. */
function clean(text: string | null | undefined) {
  return (text ?? "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/[.!]+$/, "").replace(/\s+/g, " ");
}

/** The button payload wins, then the button text, then the typed body. */
export function inboundIntent(params: URLSearchParams): Intent {
  for (const field of ["ButtonPayload", "ButtonText", "Body"]) {
    const word = clean(params.get(field));
    if (!word) continue;
    if (STOP_WORDS.has(word)) return "STOP";
    if (START_WORDS.has(word)) return "START";
    if (CONFIRM_WORDS.has(word)) return "CONFIRM";
    if (CHANGE_WORDS.has(word)) return "CHANGE";
    if (CANCEL_WORDS.has(word)) return "CANCEL";
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

/** "Thank you, see you on Fri 23 Oct, Morning, 10 am – 1 pm." */
export function confirmReply(b: Booking) {
  return replies.confirmed(b);
}

function bookingLink(b: Booking, publicUrl: string) {
  return b.viewToken ? patientPageUrl(publicUrl, b.viewToken) : `${origin(publicUrl)}/clinic/website/book?type=${encodeURIComponent(b.visitType)}`;
}

/** The patient's own page, where they pick another day or slot. The booking page when the booking has no token. */
export function changeReply(b: Booking, publicUrl: string) {
  return replies.change(bookingLink(b, publicUrl));
}

/** "To cancel or change your visit, open: {link}". The same page as Change. */
export function cancelReply(b: Booking, publicUrl: string) {
  return replies.cancel(bookingLink(b, publicUrl));
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
 * Works out the intent, finds the sender's open booking (one waiting for them first), applies it and builds the TwiML reply.
 * Confirm and Change act only on a booking that is waiting for the patient; otherwise they count as OTHER.
 * Cancel acts on any upcoming open booking (it sends the patient page link); without one it counts as OTHER.
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
  const asked = inboundIntent(params);

  const booking = phone ? await store.findLatestByPhone(phone, clinicToday(now)) : null;
  // Confirm and Change answer "your visit has moved". Without a moved visit they are just a message.
  const intent: Intent =
    ((asked === "CONFIRM" || asked === "CHANGE") && !booking?.awaitingPatient) || (asked === "CANCEL" && !booking) ? "OTHER" : asked;

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
  const optedOut = phone ? (await store.whatsappBlocks([phone]).catch(() => ({ optedOut: [phone] }))).optedOut.includes(phone) : false;
  if (intent === "STOP") {
    // Reply once: a second STOP from an opted-out number gets nothing.
    if (phone && (await store.optOut(phone, "whatsapp"))) reply = replies.stopped();
  } else if (intent === "START") {
    if (phone && (await store.optIn(phone))) reply = replies.started();
  } else if (booking && intent === "CONFIRM") {
    // The store directly, not the dashboard's PATCH: nothing else is sent.
    const updated = (await store.setAwaitingPatient(booking.id, false)) ?? booking;
    await log("patient_confirmed", "patient_confirmed");
    reply = confirmReply(updated);
  } else if (booking && intent === "CHANGE") {
    reply = changeReply(booking, publicUrl);
  } else if (booking && intent === "CANCEL") {
    reply = cancelReply(booking, publicUrl);
  } else if (!optedOut && mayAutoReply(phone ?? from ?? "unknown", now.getTime())) {
    reply = otherReply(publicUrl);
  }

  console.log(`twilio inbound: ${intent} from ${masked}, booking ${booking ? shortBookingId(booking.id) : "none"}${reply ? "" : ", no reply"}`);
  return { intent, bookingId: booking?.id ?? null, reply, xml: twiml(reply ?? undefined) };
}
