import { shortBookingId } from "@/demos/lotus-clinic/booking";
import { getStore, skippedTemplate, type Booking, type BookingStore, type MessageLog, type SkipReason } from "@/lib/bookings";
import { isDemoPhone, SKIPPED_DEMO } from "@/lib/bookings/demoPhones";
import { maskNumber, providerOf, type WhatsAppSender } from "./client";
import { getWhatsApp, HELLO_WORLD, whatsappSettings } from "./index";
import { blockReason, isNoWhatsAppError, markNoWhatsApp } from "./reachability";
import { TWILIO_CONTENT_SID_VARS } from "./twilio";
import { buildMessage, PATIENT_KINDS, whatsappNumber, type SendKind } from "./messages";

type Env = Record<string, string | undefined>;

/** What the template column holds when Twilio sent plain text (Body), not a content template. Content sends store the HX sid. */
export const PLAIN_TEXT = "text";

export { SKIPPED_DEMO };

/** Demo bookings and demo numbers (90000 2xxxx) never reach Twilio or Meta, so the live demo cannot message a stranger. */
export function isDemoBooking(b: Pick<Booking, "phone"> & { isDemo?: boolean }) {
  return b.isDemo === true || isDemoPhone(b.phone);
}

/** One log line and a row, so the dashboard says why nothing went out. No provider is called. */
async function logSkip(store: BookingStore, b: Booking, kind: SendKind, reason: SkipReason, ref: string) {
  console.log(`whatsapp: ${kind} for booking ${ref} skipped (${reason})`);
  return store.logMessage({
    bookingId: b.id,
    kind,
    provider: "fake",
    toMasked: maskNumber(b.phone),
    template: skippedTemplate(reason),
    providerMessageId: null,
    status: "sent",
    error: null,
  });
}

/**
 * Sends one message for a booking and logs it in the messages table, with the provider that carried it.
 * Meta gets the template. Twilio gets the content template (TWILIO_CONTENT_SID_*) when one is set, else the plain-text body.
 * Patient kinds go to the patient, after these checks, in order: opted out, no consent, not on WhatsApp, demo data.
 * A stopped send calls no provider: one log line and a row with template "skipped (<reason>)".
 * clinic_alert goes to CLINIC_WHATSAPP, and is skipped when that is unset; a demo booking's alert is skipped too.
 * A send that fails because the number is not on WhatsApp marks the booking and the phone (see reachability.ts).
 * Never throws: a failed send is logged as status "failed". Logs carry no names, reasons or full numbers.
 */
export async function sendBookingMessage(
  b: Booking,
  kind: SendKind,
  opts: { store?: BookingStore; sender?: WhatsAppSender; env?: Env } = {},
): Promise<MessageLog | null> {
  const env = opts.env ?? process.env;
  const ref = shortBookingId(b.id);
  try {
    const store = opts.store ?? getStore();
    if (PATIENT_KINDS.includes(kind)) {
      const reason = await blockReason(store, b);
      if (reason === "no WhatsApp" && !b.noWhatsApp) await store.setNoWhatsApp(b.id, true).catch(() => null);
      if (reason) return await logSkip(store, b, kind, reason, ref);
    } else if (isDemoBooking(b)) {
      return await logSkip(store, b, kind, "demo", ref);
    }
    let to = whatsappNumber(b.phone);
    if (kind === "clinic_alert") {
      to = whatsappSettings(env).clinicNumber;
      if (to.length < 10) {
        console.log(`whatsapp clinic alert skipped: CLINIC_WHATSAPP ${to ? "is not a full number" : "not set"}`);
        return null;
      }
    }
    const sender = opts.sender ?? getWhatsApp(env);
    const provider = providerOf(sender);
    const msg = buildMessage(kind, b, env);
    const twilioContent = provider === "twilio" && msg.contentSid ? msg.contentSid : undefined;
    if (twilioContent) {
      if (msg.contentSidReused) console.log(`whatsapp: ${TWILIO_CONTENT_SID_VARS[kind]} not set; ${kind} reuses TWILIO_CONTENT_SID_CONFIRM`);
      console.log(`whatsapp: ${kind} for booking ${ref} sent as content ${twilioContent} via twilio, variables ${JSON.stringify(msg.logContentVariables)}`);
    } else if (provider === "twilio") {
      // No content template set: free text, which only lands inside a 24 h session. The log gets it minus personal details.
      console.log(`whatsapp: ${kind} for booking ${ref} sent as text via twilio (no ${TWILIO_CONTENT_SID_VARS[kind]}): ${msg.logPreview}`);
    } else if (msg.template === HELLO_WORLD) {
      // The test number only has hello_world. Show what the custom template would say, minus personal details.
      console.log(`whatsapp: ${kind} for booking ${ref} sent as hello_world; custom template would say: ${msg.logPreview}`);
    }
    const result = await sender.sendTemplate({
      to,
      template: msg.template,
      language: msg.language,
      components: msg.components,
      text: msg.text,
      ...(twilioContent ? { contentSid: twilioContent, contentVariables: msg.contentVariables } : {}),
    });
    if (!result.ok) console.error(`whatsapp ${kind} failed for booking ${ref} via ${provider}: ${result.error ?? "unknown error"}`);
    const row = await store.logMessage({
      bookingId: b.id,
      kind,
      provider,
      toMasked: maskNumber(to),
      template: provider === "twilio" ? (twilioContent ?? PLAIN_TEXT) : msg.template,
      providerMessageId: result.messageId ?? null,
      status: result.ok ? "sent" : "failed",
      error: result.ok ? null : (result.error ?? "unknown error"),
    });
    if (!result.ok && isNoWhatsAppError(provider, result.error)) await markNoWhatsApp(store, row);
    return row;
  } catch (err) {
    console.error(`whatsapp ${kind} not logged for booking ${ref}: ${err instanceof Error ? err.message : "unknown error"}`);
    return null;
  }
}
