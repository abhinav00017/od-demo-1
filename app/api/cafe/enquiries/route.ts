import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { referenceOf } from "@/lib/cafeEvents";
import { json } from "@/lib/cafeEvents/http";
import { submitEnquiry } from "@/lib/cafeEvents/submit";
import { HONEYPOT } from "@/lib/cafeEvents/validation";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/**
 * Saves an event enquiry from a Solstice venue page. Public. Runs the same checks as the form, with today in India,
 * and keeps the visitor's first-touch source. 201 with the reference, or 400 with field errors. 10 a minute per IP.
 */
export async function POST(req: NextRequest) {
  if (!rateLimit(`cafe-enquiry:${clientIp(req.headers)}`)) {
    return json({ ok: false, error: "Too many enquiries. Please wait a minute and try again." }, 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Send the enquiry as JSON." }, 400);
  }

  // A bot filled the hidden field. Answer as if it worked, and save nothing.
  if (body && typeof body === "object" && typeof (body as Record<string, unknown>)[HONEYPOT] === "string" && (body as Record<string, string>)[HONEYPOT].trim()) {
    return json({ ok: true, reference: referenceOf(randomUUID()) }, 201);
  }

  const result = await submitEnquiry(body, { channel: "form" });
  return result.status === 201 ? json({ ok: true, reference: result.body.reference }, 201) : json(result.body, result.status);
}
