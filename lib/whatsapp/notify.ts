import { shortBookingId } from "@/demos/lotus-clinic/booking";
import { getStore, type Booking, type BookingStore, type MessageLog } from "@/lib/bookings";
import { maskNumber, type WhatsAppSender } from "./client";
import { getWhatsApp, HELLO_WORLD, whatsappSettings } from "./index";
import { buildMessage, whatsappNumber, type SendKind } from "./messages";

type Env = Record<string, string | undefined>;

/**
 * Sends one template for a booking and logs it in the messages table.
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
    const msg = buildMessage(kind, b, env);
    if (msg.template === HELLO_WORLD) {
      // The test number only has hello_world. Show what the custom template would say, minus personal details.
      console.log(`whatsapp: ${kind} for booking ${ref} sent as hello_world; custom template would say: ${msg.logPreview}`);
    }
    const result = await sender.sendTemplate({ to, template: msg.template, language: msg.language, components: msg.components });
    if (!result.ok) console.error(`whatsapp ${kind} failed for booking ${ref}: ${result.error ?? "unknown error"}`);
    return await store.logMessage({
      bookingId: b.id,
      kind,
      toMasked: maskNumber(to),
      template: msg.template,
      providerMessageId: result.messageId ?? null,
      status: result.ok ? "sent" : "failed",
      error: result.ok ? null : (result.error ?? "unknown error"),
    });
  } catch (err) {
    console.error(`whatsapp ${kind} not logged for booking ${ref}: ${err instanceof Error ? err.message : "unknown error"}`);
    return null;
  }
}
