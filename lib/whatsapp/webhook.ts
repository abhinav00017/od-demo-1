import { createHmac, timingSafeEqual } from "node:crypto";
import { scrubDigits } from "./client";

/** X-Hub-Signature-256 is "sha256=" plus the hex HMAC of the raw body, keyed with the Meta app secret. */
export function validSignature(raw: string, header: string | null, secret: string) {
  if (!header?.startsWith("sha256=")) return false;
  const given = Buffer.from(header.slice(7), "hex");
  const wanted = createHmac("sha256", secret).update(raw).digest();
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

type MetaErr = { code?: number; title?: string; message?: string; error_data?: { details?: string } };
export type StatusEvent = { id?: string; status?: string; errors?: MetaErr[] };
export type InboundMessage = { type?: string; text?: { body?: string } };
export type WebhookPayload = { entry?: { changes?: { value?: { statuses?: StatusEvent[]; messages?: InboundMessage[] } }[] }[] };

/** Flattens Meta's entry[].changes[].value nesting into the two lists we use. */
export function parseWebhook(payload: WebhookPayload) {
  const values = (payload.entry ?? []).flatMap((e) => (e.changes ?? []).map((c) => c.value ?? {}));
  return {
    statuses: values.flatMap((v) => v.statuses ?? []),
    messages: values.flatMap((v) => v.messages ?? []),
  };
}

/** A failed status's first error as a short line with no phone numbers, like "131026: Message undeliverable". */
export function statusError(s: StatusEvent) {
  const e = s.errors?.[0];
  if (!e) return "failed";
  return scrubDigits(`${e.code ? `${e.code}: ` : ""}${e.error_data?.details || e.title || e.message || "failed"}`).slice(0, 160);
}
