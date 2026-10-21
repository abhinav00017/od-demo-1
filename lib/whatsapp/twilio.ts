/**
 * Twilio WhatsApp sender. Plain fetch, no SDK.
 * Docs: https://www.twilio.com/docs/messaging/api/message-resource#create-a-message-resource
 *
 * The Twilio sandbox sends free text inside the 24 h session that opens when the recipient
 * sends the join message. So sendTemplate sends the template's plain-text body, not a template.
 */
import { scrubDigits, type SendResult, type WhatsAppSender } from "./client";

export const TWILIO_API_BASE = "https://api.twilio.com";
/** Twilio's shared WhatsApp sandbox number. A public number, not a secret. */
export const TWILIO_SANDBOX_FROM = "+14155238886";
export const TWILIO_STATUS_PATH = "/api/whatsapp/twilio-status";

export type TwilioOptions = {
  accountSid: string;
  authToken: string;
  /** The sending number, like "+14155238886" or "whatsapp:+14155238886". */
  from: string;
  /** Site origin, like "https://od-demo-lyart.vercel.app". Set = Twilio posts delivery statuses back. */
  publicUrl?: string;
  /** Tests and local mocks only. */
  apiBase?: string;
  fetchImpl?: typeof fetch;
};

/** "919876543210", "+91 98765 43210" or "whatsapp:+919876543210" -> "whatsapp:+919876543210". */
export function twilioAddress(number: string) {
  return `whatsapp:+${number.replace(/^whatsapp:/, "").replace(/\D/g, "")}`;
}

/** The status callback URL for a site origin. Trailing slashes are dropped. */
export function twilioStatusUrl(publicUrl: string) {
  return `${publicUrl.replace(/\/+$/, "")}${TWILIO_STATUS_PATH}`;
}

type TwilioError = { code?: number; message?: string };
type TwilioOk = { sid?: string };

/** Twilio's error body -> a short line like "63015: Channel Sandbox can only send messages to phone numbers that have joined". */
function shortError(status: number, body: unknown) {
  const e = body as TwilioError | undefined;
  const text = e?.message || `HTTP ${status}`;
  return scrubDigits(`${e?.code ? `${e.code}: ` : ""}${text}`).slice(0, 160);
}

export function twilioSender(opts: TwilioOptions): WhatsAppSender {
  const base = (opts.apiBase || TWILIO_API_BASE).replace(/\/+$/, "");
  const url = `${base}/2010-04-01/Accounts/${encodeURIComponent(opts.accountSid)}/Messages.json`;
  const auth = `Basic ${Buffer.from(`${opts.accountSid}:${opts.authToken}`).toString("base64")}`;

  async function post(to: string, body: string): Promise<SendResult> {
    try {
      const form = new URLSearchParams({ From: twilioAddress(opts.from), To: twilioAddress(to), Body: body });
      if (opts.publicUrl) form.set("StatusCallback", twilioStatusUrl(opts.publicUrl));
      const res = await (opts.fetchImpl ?? fetch)(url, {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
        signal: AbortSignal.timeout(8000),
      });
      const json: unknown = await res.json().catch(() => undefined);
      if (!res.ok) return { ok: false, error: shortError(res.status, json) };
      const messageId = (json as TwilioOk | undefined)?.sid;
      return messageId ? { ok: true, messageId } : { ok: false, error: "Twilio answered without a message sid" };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? `${err.name}: request did not complete` : "request did not complete" };
    }
  }

  return {
    kind: "twilio",
    async sendTemplate({ to, template, text }) {
      // No templates in the sandbox. The builder's plain-text body is the message.
      if (!text?.trim()) return { ok: false, error: `no text for template ${template}; Twilio sends plain text only` };
      return post(to, text);
    },
    sendText({ to, body }) {
      return post(to, body);
    },
  };
}
