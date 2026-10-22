import type { NextRequest } from "next/server";
import { getStore } from "@/lib/bookings";
import { handleInbound, TWILIO_INBOUND_PATH, twiml } from "@/lib/whatsapp/inbound";
import { twilioSignedUrls, validTwilioSignature } from "@/lib/whatsapp/twilioStatus";

/**
 * Twilio "Receive a message" webhook for WhatsApp. Form-encoded POST.
 * Checks X-Twilio-Signature with TWILIO_AUTH_TOKEN when it is set (bad = 403).
 * Confirm / Change time taps act on the sender's latest open booking. Always 200 with TwiML otherwise.
 */

const xml = (body: string) => new Response(body, { status: 200, headers: { "Content-Type": "text/xml; charset=utf-8" } });

export async function POST(req: NextRequest) {
  const params = new URLSearchParams(await req.text());
  const publicUrl = process.env.WHATSAPP_PUBLIC_URL;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (token) {
    if (!validTwilioSignature(token, req.headers.get("x-twilio-signature"), twilioSignedUrls(req, publicUrl, TWILIO_INBOUND_PATH), params)) {
      console.log("twilio inbound: bad signature, ignored");
      return new Response("Bad signature", { status: 403 });
    }
  } else {
    console.log("twilio inbound: TWILIO_AUTH_TOKEN not set, signature not checked");
  }

  try {
    const result = await handleInbound(params, { store: getStore(), publicUrl: publicUrl || req.nextUrl.origin });
    return xml(result.xml);
  } catch (err) {
    console.error(`twilio inbound failed: ${err instanceof Error ? err.message : "unknown error"}`);
    return xml(twiml());
  }
}
