import { parseAttribution } from "@/lib/bookings/attribution";
import { CAFE_SLUG, getEnquiryStore, type Enquiry, type EnquiryChannel } from "./index";
import { checkEnquiry, indiaToday } from "./validation";

export type SubmitEnquiryResult =
  | { status: 201; body: { ok: true; reference: string; enquiry: Enquiry } }
  | { status: 400; body: { ok: false; error: string; fieldErrors: Record<string, string> } }
  | { status: 500; body: { ok: false; error: string } };

/**
 * The one way an event enquiry is saved: the venue page's form (POST /api/cafe/enquiries, channel "form") and Ogi's
 * Confirm button (POST /api/ogi/confirm, channel "ogi") both call this, as the clinic's form and Ogi share
 * submitPublicBooking. `body` is untrusted JSON. It runs the one zod schema with today in India, re-checks the
 * first-touch attribution (only the public sources; anything else becomes website), and saves.
 */
export async function submitEnquiry(body: unknown, { channel }: { channel: EnquiryChannel }): Promise<SubmitEnquiryResult> {
  const checked = checkEnquiry(body, indiaToday());
  if (!checked.ok) {
    return { status: 400, body: { ok: false, error: Object.values(checked.fieldErrors)[0] ?? "Please check the form.", fieldErrors: checked.fieldErrors } };
  }
  const attribution = parseAttribution(body);
  try {
    const enquiry = await getEnquiryStore().create({ cafeSlug: CAFE_SLUG, ...checked.data, ...attribution, channel });
    return { status: 201, body: { ok: true, reference: enquiry.reference, enquiry } };
  } catch (err) {
    console.error(`cafe enquiry save failed: ${err instanceof Error ? err.message : "unknown error"}`);
    return { status: 500, body: { ok: false, error: "We could not save your enquiry. Please try again." } };
  }
}
