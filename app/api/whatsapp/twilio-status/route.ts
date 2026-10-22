import type { NextRequest } from "next/server";
import { getStore } from "@/lib/bookings";
import { TWILIO_STATUS_PATH } from "@/lib/whatsapp/twilio";
import { mapTwilioStatus, twilioSignedUrls, twilioStatusError, validTwilioSignature } from "@/lib/whatsapp/twilioStatus";

/**
 * Twilio status callback for WhatsApp sends: queued, sent, delivered, read, failed, undelivered.
 * Form-encoded POST. Checks X-Twilio-Signature with TWILIO_AUTH_TOKEN when it is set (bad = 403).
 * Updates the message log by Twilio's message sid, forward only. Answers 200 fast otherwise.
 */

const ok = () => new Response(null, { status: 200 });

export async function POST(req: NextRequest) {
  const params = new URLSearchParams(await req.text());
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (token) {
    if (!validTwilioSignature(token, req.headers.get("x-twilio-signature"), twilioSignedUrls(req, process.env.WHATSAPP_PUBLIC_URL, TWILIO_STATUS_PATH), params)) {
      console.log("twilio status: bad signature, ignored");
      return new Response("Bad signature", { status: 403 });
    }
  } else {
    console.log("twilio status: TWILIO_AUTH_TOKEN not set, signature not checked");
  }

  const sid = params.get("MessageSid") ?? params.get("SmsSid");
  const raw = params.get("MessageStatus") ?? params.get("SmsStatus");
  const status = mapTwilioStatus(raw);
  if (!sid || !status) {
    console.log(`twilio status: ${raw ?? "no status"} not tracked`);
    return ok();
  }
  try {
    const row = await getStore().updateMessageStatus(sid, status, status === "failed" ? twilioStatusError(params) : null);
    console.log(`twilio status: ${raw} -> ${status}${row ? "" : " (no newer log row)"}`);
  } catch (err) {
    console.error(`twilio status update failed: ${err instanceof Error ? err.message : "unknown error"}`);
  }
  return ok();
}
