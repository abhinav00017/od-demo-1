import { cloudSender, DEFAULT_PHONE_NUMBER_ID, type Provider, type WhatsAppSender } from "./client";
import { fakeSender } from "./fake";
import { twilioSender } from "./twilio";

export * from "./client";
export { fakeSender } from "./fake";
export { twilioSender, TWILIO_SANDBOX_FROM, twilioStatusUrl } from "./twilio";

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

const hasTwilio = (env: Env) => Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM);
const hasMeta = (env: Env) => Boolean(env.WHATSAPP_TOKEN);

/** Why the provider asked for in WHATSAPP_PROVIDER is not the one in use. Null when nothing is off. */
export function providerProblem(env: Env = process.env): string | null {
  if (env.WHATSAPP_FAKE === "1") return null;
  const wanted = (env.WHATSAPP_PROVIDER ?? "").trim().toLowerCase();
  if (!wanted) return null;
  if (wanted === "twilio" && !hasTwilio(env)) return "WHATSAPP_PROVIDER=twilio but TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN or TWILIO_WHATSAPP_FROM is not set; using the fake sender";
  if (wanted === "meta" && !hasMeta(env)) return "WHATSAPP_PROVIDER=meta but WHATSAPP_TOKEN is not set; using the fake sender";
  if (!["twilio", "meta", "fake"].includes(wanted)) return "WHATSAPP_PROVIDER is not twilio, meta or fake; picking from the vars that are set";
  return null;
}

/**
 * Which provider sends. WHATSAPP_FAKE=1 always means fake.
 * WHATSAPP_PROVIDER=twilio|meta|fake picks one; a named provider without its vars falls back to fake.
 * Unset: twilio when the three TWILIO_* vars are set, else meta when WHATSAPP_TOKEN is set, else fake.
 */
export function providerName(env: Env = process.env): Provider {
  if (env.WHATSAPP_FAKE === "1") return "fake";
  const wanted = (env.WHATSAPP_PROVIDER ?? "").trim().toLowerCase();
  if (wanted === "fake") return "fake";
  if (wanted === "twilio") return hasTwilio(env) ? "twilio" : "fake";
  if (wanted === "meta") return hasMeta(env) ? "meta" : "fake";
  if (hasTwilio(env)) return "twilio";
  if (hasMeta(env)) return "meta";
  return "fake";
}

/** True when a real provider is set up and the fake is not forced. */
export function isConfigured(env: Env = process.env) {
  return providerName(env) !== "fake";
}

let warned: string | null = null;

/** The sender for the provider providerName() picks. */
export function getWhatsApp(env: Env = process.env, fetchImpl?: typeof fetch): WhatsAppSender {
  const problem = providerProblem(env);
  if (problem && problem !== warned) {
    // Once per process per problem, so a misconfigured Vercel env shows up in the logs without flooding them.
    warned = problem;
    console.warn(`whatsapp: ${problem}`);
  }
  const provider = providerName(env);
  if (provider === "twilio") {
    return twilioSender({
      accountSid: env.TWILIO_ACCOUNT_SID!,
      authToken: env.TWILIO_AUTH_TOKEN!,
      from: env.TWILIO_WHATSAPP_FROM!,
      publicUrl: env.WHATSAPP_PUBLIC_URL || undefined,
      // Local mock servers only. Ignored in production, so credentials only ever go to api.twilio.com there.
      apiBase: env.NODE_ENV === "production" ? undefined : env.TWILIO_API_BASE || undefined,
      fetchImpl,
    });
  }
  if (provider === "meta") return cloudSender({ token: env.WHATSAPP_TOKEN!, phoneNumberId: whatsappSettings(env).phoneNumberId, fetchImpl });
  return fakeSender;
}
