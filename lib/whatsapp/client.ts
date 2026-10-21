/**
 * Meta WhatsApp Cloud API sender. Plain fetch, no SDK.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
 */

import type { MessageProvider } from "@/lib/bookings/types";

export const GRAPH_VERSION = "v25.0";
/** The Onlydevs test number, +1 (555) 672-3191. An id, not a secret. */
export const DEFAULT_PHONE_NUMBER_ID = "1300202886519854";

export type SendResult = { ok: boolean; messageId?: string; error?: string };

/** A body parameter list for a template, as the Cloud API expects it. */
export type TemplateComponent = { type: "body"; parameters: { type: "text"; text: string }[] };

export type TemplateRequest = {
  to: string;
  template: string;
  language?: string;
  components?: TemplateComponent[];
  /** The plain text the template would show. Providers that send free text (Twilio sandbox) send this instead. */
  text?: string;
};
export type TextRequest = { to: string; body: string };

/** Who carries the message: meta, twilio or fake. Stored on every message log row. */
export type Provider = MessageProvider;

export interface WhatsAppSender {
  /** "cloud" is Meta's Cloud API. */
  readonly kind: "cloud" | "twilio" | "fake";
  sendTemplate(req: TemplateRequest): Promise<SendResult>;
  sendText(req: TextRequest): Promise<SendResult>;
}

/** "919876543210" -> "••••3210". The only form of a number that may reach logs or the database. */
export function maskNumber(to: string) {
  const digits = to.replace(/\D/g, "");
  return `••••${digits.slice(-4)}`;
}

/** The provider name a sender stands for, as the message log stores it. */
export function providerOf(sender: Pick<WhatsAppSender, "kind">): Provider {
  return sender.kind === "cloud" ? "meta" : sender.kind;
}

/** Long digit runs could be phone numbers. Errors are logged and stored, so they never carry one. */
export function scrubDigits(text: string) {
  return text.replace(/\+?\d[\d\s-]{6,}\d/g, "•••");
}

type MetaError = { error?: { message?: string; code?: number; error_data?: { details?: string } } };
type MetaOk = { messages?: { id?: string }[] };

/** Meta's error body -> a short line like "131030: Recipient phone number not in allowed list". */
function shortError(status: number, body: unknown) {
  const e = (body as MetaError | undefined)?.error;
  const text = e?.error_data?.details || e?.message || `HTTP ${status}`;
  return scrubDigits(`${e?.code ? `${e.code}: ` : ""}${text}`).slice(0, 160);
}

export function cloudSender(opts: { token: string; phoneNumberId?: string; fetchImpl?: typeof fetch }): WhatsAppSender {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${opts.phoneNumberId || DEFAULT_PHONE_NUMBER_ID}/messages`;

  async function post(payload: Record<string, unknown>): Promise<SendResult> {
    try {
      const res = await (opts.fetchImpl ?? fetch)(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${opts.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", ...payload }),
        signal: AbortSignal.timeout(8000),
      });
      const body: unknown = await res.json().catch(() => undefined);
      if (!res.ok) return { ok: false, error: shortError(res.status, body) };
      const messageId = (body as MetaOk | undefined)?.messages?.[0]?.id;
      return messageId ? { ok: true, messageId } : { ok: false, error: "Meta answered without a message id" };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? `${err.name}: request did not complete` : "request did not complete" };
    }
  }

  return {
    kind: "cloud",
    sendTemplate({ to, template, language = "en_US", components }) {
      return post({
        to,
        type: "template",
        template: { name: template, language: { code: language }, ...(components?.length ? { components } : {}) },
      });
    },
    sendText({ to, body }) {
      return post({ to, type: "text", text: { preview_url: false, body } });
    },
  };
}
