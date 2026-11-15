import type { NextRequest } from "next/server";
import { shortBookingId } from "@/demos/lotus-clinic/booking";
import { json } from "@/lib/bookings/http";
import { submitPublicBooking } from "@/lib/bookings/publicBooking";
import { claimNonce, releaseNonce, verifyConfirm } from "@/lib/ogi/confirmToken";
import { logOgi } from "@/lib/ogi/log";
import { profileForPage } from "@/lib/ogi/profiles";
import { confirmRequestSchema } from "@/lib/ogi/request";
import { allowedTools } from "@/lib/ogi/tools";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/**
 * The visitor pressed Confirm on Ogi's visit summary. The only way a chat becomes a booking:
 * a server-signed, unexpired, unused token, then the same validated service as the public booking form.
 */
export async function POST(req: NextRequest) {
  // Shares the booking form's per-IP limit: the same visitor, the same bookings.
  if (!rateLimit(`book:${clientIp(req.headers)}`)) {
    return json({ ok: false, error: "Too many booking requests. Please wait a minute and try again." }, 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Send the confirmation as JSON." }, 400);
  }
  const parsed = confirmRequestSchema.safeParse(body);
  if (!parsed.success) return json({ ok: false, error: "That confirmation could not be read." }, 400);

  const verified = verifyConfirm(parsed.data.token);
  if (!verified.ok) {
    logOgi({ event: "tool", page: "unknown", role: "visitor", tool: "confirm", outcome: verified.reason });
    return verified.reason === "expired"
      ? json({ ok: false, error: "This summary has expired. Ask Ogi again, or use the booking page." }, 410)
      : json({ ok: false, error: "This confirmation is not valid." }, 400);
  }

  const { page, visit, nonce, exp } = verified.payload;
  const profile = profileForPage(page);
  if (!profile || !allowedTools("visitor", profile).includes("request_visit")) {
    return json({ ok: false, error: "This confirmation is not valid." }, 400);
  }

  if (!claimNonce(nonce, exp)) return json({ ok: false, error: "This visit request was already sent." }, 409);

  const { token: _token, ...attribution } = parsed.data;
  void _token;
  // Submitting is the consent, exactly as on the form: the summary shows CONSENT_TEXT_V1 under the Confirm button.
  const result = await submitPublicBooking({ ...attribution, ...visit, consent: true }, { origin: req.nextUrl.origin });
  if (result.status !== 201) {
    releaseNonce(nonce);
    logOgi({ event: "tool", page: profile.key, role: "visitor", tool: "confirm", outcome: `failed_${result.status}` });
    return json(result.body, result.status);
  }
  logOgi({ event: "tool", page: profile.key, role: "visitor", tool: "confirm", outcome: "booked" });
  return json({ ok: true, ref: shortBookingId(result.body.id) }, 201);
}
