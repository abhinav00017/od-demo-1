import { maskNumber, type WhatsAppSender } from "./client";

/**
 * Stand-in sender for local dev and tests. Logs one line, sends nothing, returns a fake message id.
 * Used when WHATSAPP_TOKEN is missing or WHATSAPP_FAKE=1.
 */
export const fakeSender: WhatsAppSender = {
  kind: "fake",
  async sendTemplate({ to, template }) {
    console.log(`whatsapp (fake): template ${template} to ${maskNumber(to)}`);
    return { ok: true, messageId: `wamid.fake-${crypto.randomUUID()}` };
  },
  async sendText({ to }) {
    console.log(`whatsapp (fake): text to ${maskNumber(to)}`);
    return { ok: true, messageId: `wamid.fake-${crypto.randomUUID()}` };
  },
};
