/**
 * Twilio WhatsApp sender. Plain fetch, no SDK.
 * Docs: https://www.twilio.com/docs/messaging/api/message-resource#create-a-message-resource
 *
 * Twilio's quickstart WhatsApp sender only takes business-initiated messages as Content Templates:
 * ContentSid (HX...) plus ContentVariables. So sendTemplate sends the content template when the request
 * carries a contentSid, and the plain-text body (Body) otherwise. Body only works inside a 24 h session
 * the recipient opened; outside it Twilio answers 21654 or 63016.
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

type Env = Record<string, string | undefined>;
type ContentKind = "confirmation" | "reminder" | "clinic_alert";

/** The env var holding the Twilio Content Template sid (HX...) for each message kind. */
export const TWILIO_CONTENT_SID_VARS: Record<ContentKind, string> = {
  confirmation: "TWILIO_CONTENT_SID_CONFIRM",
  reminder: "TWILIO_CONTENT_SID_REMINDER",
  clinic_alert: "TWILIO_CONTENT_SID_CLINIC_ALERT",
};

/**
 * The Content Template sid for a kind. Reminder and clinic alert reuse the confirmation sid when their own
 * var is unset, so the demo runs on one sample template. `reused` says that happened. No sid = send Body.
 */
export function twilioContentSid(kind: ContentKind, env: Env = process.env): { sid?: string; reused: boolean } {
  const own = env[TWILIO_CONTENT_SID_VARS[kind]]?.trim();
  if (own) return { sid: own, reused: false };
  const confirm = env.TWILIO_CONTENT_SID_CONFIRM?.trim();
  if (kind !== "confirmation" && confirm) return { sid: confirm, reused: true };
  return { reused: false };
}

/**
 * Twilio errors that mean "no session with this recipient": either the send needs a content template,
 * or the recipient never sent the join message. The dashboard shows the hint with them.
 */
const NEEDS_CONTENT = new Set(["21654", "63016"]);
export const CONTENT_HINT = "set TWILIO_CONTENT_SID_*";
/** The hint those errors carry. The dashboard shows it on its own line, because the row cuts long errors. */
export const NO_SESSION_HINT = `${CONTENT_HINT}, or patient has not joined on WhatsApp yet`;

/** "21654: ContentSid Required" -> "21654: ContentSid Required (set TWILIO_CONTENT_SID_*, or patient has not joined on WhatsApp yet)". Other errors pass through. Max 160 chars. */
export function withContentHint(code: string | number | null | undefined, line: string) {
  if (code === null || code === undefined || !NEEDS_CONTENT.has(String(code))) return line.slice(0, 160);
  const hint = ` (${NO_SESSION_HINT})`;
  return `${line.slice(0, 160 - hint.length)}${hint}`;
}

type TwilioError = { code?: number; message?: string };
type TwilioOk = { sid?: string };

/** Twilio's error body -> a short line like "63015: Channel Sandbox can only send messages to phone numbers that have joined". */
function shortError(status: number, body: unknown) {
  const e = body as TwilioError | undefined;
  const text = e?.message || `HTTP ${status}`;
  return withContentHint(e?.code, scrubDigits(`${e?.code ? `${e.code}: ` : ""}${text}`));
}

export function twilioSender(opts: TwilioOptions): WhatsAppSender {
  const base = (opts.apiBase || TWILIO_API_BASE).replace(/\/+$/, "");
  const url = `${base}/2010-04-01/Accounts/${encodeURIComponent(opts.accountSid)}/Messages.json`;
  const auth = `Basic ${Buffer.from(`${opts.accountSid}:${opts.authToken}`).toString("base64")}`;

  /** Sends either a Body or a content template. Never both: Twilio wants no Body with a ContentSid. */
  async function post(to: string, message: { body: string } | { contentSid: string; contentVariables?: Record<string, string> }): Promise<SendResult> {
    try {
      const form = new URLSearchParams({ From: twilioAddress(opts.from), To: twilioAddress(to) });
      if ("contentSid" in message) {
        form.set("ContentSid", message.contentSid);
        if (message.contentVariables && Object.keys(message.contentVariables).length) form.set("ContentVariables", JSON.stringify(message.contentVariables));
      } else {
        form.set("Body", message.body);
      }
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
    async sendTemplate({ to, template, text, contentSid, contentVariables }) {
      if (contentSid) return post(to, { contentSid, contentVariables });
      // No content template configured: send the plain text. Works only inside a 24 h session.
      if (!text?.trim()) return { ok: false, error: `no text for template ${template} and no content sid; ${CONTENT_HINT}` };
      return post(to, { body: text });
    },
    sendText({ to, body }) {
      return post(to, { body });
    },
  };
}
