import type { NextRequest } from "next/server";
import { getStore, isMessageStatus } from "@/lib/bookings";
import { parseWebhook, statusError, validSignature, type WebhookPayload } from "@/lib/whatsapp/webhook";

/**
 * Meta WhatsApp webhook.
 * GET: Meta's one-time check when the callback URL is saved. Echoes hub.challenge when the verify token matches.
 * POST: delivery statuses (sent, delivered, read, failed) and inbound messages. Answers 200 fast.
 */

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (expected && q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === expected) {
    return new Response(q.get("hub.challenge") ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  console.log(`whatsapp webhook: verify refused${expected ? "" : " (WHATSAPP_VERIFY_TOKEN not set)"}`);
  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (secret) {
    // Only a request Meta signed gets in. Meta's own requests always carry a valid signature.
    if (!validSignature(raw, req.headers.get("x-hub-signature-256"), secret)) {
      console.log("whatsapp webhook: bad signature, ignored");
      return new Response("Bad signature", { status: 401 });
    }
  } else {
    console.log("whatsapp webhook: WHATSAPP_APP_SECRET not set, signature not checked");
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(raw) as WebhookPayload;
  } catch {
    return new Response("OK", { status: 200 });
  }

  const { statuses, messages } = parseWebhook(payload);
  const store = getStore();
  for (const s of statuses) {
    if (!s.id || !isMessageStatus(s.status)) continue;
    try {
      const row = await store.updateMessageStatus(s.id, s.status, s.status === "failed" ? statusError(s) : null);
      console.log(`whatsapp status: ${s.status}${row ? "" : " (no newer log row)"}`);
    } catch (err) {
      console.error(`whatsapp status update failed: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }
  for (const m of messages) {
    // Replies are not stored yet. One line, no number, no text: a patient's message is theirs.
    const length = m.type === "text" ? ` (${m.text?.body?.length ?? 0} chars)` : "";
    console.log(`whatsapp inbound: ${m.type ?? "unknown"} message${length}`);
  }
  return new Response("OK", { status: 200 });
}
