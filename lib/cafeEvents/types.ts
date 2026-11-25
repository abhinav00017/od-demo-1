import type { EventTypeId, VenueId } from "@/demos/solstice-cafe/events";
import type { PublicSource, Utm } from "@/lib/bookings/sources";

/** The demo cafe every enquiry belongs to. Its organization (lib/orgs.ts) is found from this slug. */
export const CAFE_SLUG = "solstice-cafe";

/** new → contacted → confirmed or declined. The owner can set any of them, to fix a slip. */
export const ENQUIRY_STATUSES = ["new", "contacted", "confirmed", "declined"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

/** How an enquiry was sent: the venue page's form, or Ogi's Confirm button. */
export const ENQUIRY_CHANNELS = ["form", "ogi"] as const;
export type EnquiryChannel = (typeof ENQUIRY_CHANNELS)[number];

export type Enquiry = {
  id: string;
  /** What the visitor sees on the thank-you screen and the owner sees on the row, like EV-1A2B3C4D. */
  reference: string;
  createdAt: string;
  cafeSlug: string;
  venue: VenueId;
  eventType: EventTypeId;
  /** YYYY-MM-DD, the cafe's calendar day. */
  date: string;
  slot: string;
  guests: number;
  name: string;
  /** 10 digits. */
  phone: string;
  notes: string;
  status: EnquiryStatus;
  statusUpdatedAt: string | null;
  /** First-touch source, the same list the clinic's public booking form may claim. Display only. */
  source: PublicSource;
  campaign: string | null;
  utm: Utm | null;
  channel: EnquiryChannel;
  /** Sample data from the demo seed. */
  isDemo: boolean;
};

export type NewEnquiry = Pick<
  Enquiry,
  "cafeSlug" | "venue" | "eventType" | "date" | "slot" | "guests" | "name" | "phone" | "notes" | "source" | "campaign" | "utm" | "channel"
>;

/** A sample enquiry from the demo seed: a new enquiry with its own times and status. */
export type DemoEnquiry = Omit<NewEnquiry, "cafeSlug"> & Pick<Enquiry, "createdAt" | "status" | "statusUpdatedAt">;

export interface EnquiryStore {
  kind: "memory" | "postgres";
  create(input: NewEnquiry): Promise<Enquiry>;
  /** Newest first. */
  list(cafeSlug: string): Promise<Enquiry[]>;
  /** The updated enquiry, or undefined when this cafe has no enquiry with that id. */
  setStatus(cafeSlug: string, id: string, status: EnquiryStatus): Promise<Enquiry | undefined>;
  /** Deletes this cafe's demo enquiries and inserts the given ones as demo rows. Real enquiries are never touched. */
  replaceDemo(cafeSlug: string, rows: DemoEnquiry[]): Promise<{ deleted: number; inserted: number }>;
}

/** The reference is the id's first 8 hex characters, so it needs no column of its own. */
export function referenceOf(id: string) {
  return `EV-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID.test(v);
