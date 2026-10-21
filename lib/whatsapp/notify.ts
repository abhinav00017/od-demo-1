import { shortBookingId } from "@/demos/lotus-clinic/booking";
import { getStore, type Booking, type BookingStore, type MessageLog } from "@/lib/bookings";
import { maskNumber, providerOf, type WhatsAppSender } from "./client";
import { getWhatsApp, HELLO_WORLD, whatsappSettings } from "./index";
import { TWILIO_CONTENT_SID_VARS } from "./twilio";
import { buildMessage, whatsappNumber, type SendKind } from "./messages";

type Env = Record<string, string | undefined>;

/** What the template column holds when Twilio sent plain text (Body), not a content template. Content sends store the HX sid. */
export const PLAIN_TEXT = "text";

/**
 * Sends one message for a booking and logs it in the messages table, with the provider that carried it.
 * Meta gets the template. Twilio gets the content template (TWILIO_CONTENT_SID_*) when one is set, else the plain-text body.
 * Confirmation and reminder go to the patient. clinic_alert goes to CLINIC_WHATSAPP, and is skipped when that is unset.
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
    let to = whatsappNumber(b.phone);
    if (kind === "clinic_alert") {
      to = whatsappSettings(env).clinicNumber;
      if (to.length < 10) {
        console.log(`whatsapp clinic alert skipped: CLINIC_WHATSAPP ${to ? "is not a full number" : "not set"}`);
        return null;
      }
    }
    const store = opts.store ?? getStore();
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
    return await store.logMessage({
      bookingId: b.id,
      kind,
      provider,
      toMasked: maskNumber(to),
      template: provider === "twilio" ? (twilioContent ?? PLAIN_TEXT) : msg.template,
      providerMessageId: result.messageId ?? null,
      status: result.ok ? "sent" : "failed",
      error: result.ok ? null : (result.error ?? "unknown error"),
    });
  } catch (err) {
    console.error(`whatsapp ${kind} not logged for booking ${ref}: ${err instanceof Error ? err.message : "unknown error"}`);
    return null;
  }
}
