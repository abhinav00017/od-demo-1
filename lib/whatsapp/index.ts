import { cloudSender, DEFAULT_PHONE_NUMBER_ID, type WhatsAppSender } from "./client";
import { fakeSender } from "./fake";

export * from "./client";
export { fakeSender } from "./fake";

type Env = Record<string, string | undefined>;

/** The pre-approved template every WhatsApp test number has. It takes no parameters. */
export const HELLO_WORLD = "hello_world";

/** Settings read from env. Template names fall back to hello_world until custom ones are approved. */
export function whatsappSettings(env: Env = process.env) {
  return {
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID || DEFAULT_PHONE_NUMBER_ID,
    templates: {
      confirmation: env.WHATSAPP_TEMPLATE_CONFIRM || HELLO_WORLD,
      reminder: env.WHATSAPP_TEMPLATE_REMINDER || HELLO_WORLD,
      clinic_alert: env.WHATSAPP_TEMPLATE_CLINIC_ALERT || HELLO_WORLD,
    },
    /** The clinic's own WhatsApp number, E.164 digits without the plus. No default: unset means no clinic alert. */
    clinicNumber: (env.CLINIC_WHATSAPP ?? "").replace(/\D/g, ""),
    language: env.WHATSAPP_TEMPLATE_LANG || "en_US",
  };
}

/** True when a real token is set and the fake is not forced. */
export function isConfigured(env: Env = process.env) {
  return Boolean(env.WHATSAPP_TOKEN) && env.WHATSAPP_FAKE !== "1";
}

/** The real Cloud API sender when configured, otherwise the fake that only logs. */
export function getWhatsApp(env: Env = process.env, fetchImpl?: typeof fetch): WhatsAppSender {
  if (!isConfigured(env)) return fakeSender;
  return cloudSender({ token: env.WHATSAPP_TOKEN!, phoneNumberId: whatsappSettings(env).phoneNumberId, fetchImpl });
}
