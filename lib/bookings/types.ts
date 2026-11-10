import type { BookingSource, Utm } from "./sources";

export * from "./sources";

/** visited and no_show close a booking on its day or after. They never send anything on WhatsApp. */
export const BOOKING_STATUSES = ["new", "confirmed", "cancelled", "visited", "no_show"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Statuses that only make sense on the booking's day or later. */
export const ATTENDANCE_STATUSES: readonly BookingStatus[] = ["visited", "no_show"];

/** One row of the bookings table, as the API and the dashboard see it. */
export type Booking = {
  id: string;
  /** ISO timestamp. */
  createdAt: string;
  clinicSlug: string;
  name: string;
  /** 10 digits, no +91. */
  phone: string;
  visitType: string;
  /** YYYY-MM-DD, the clinic's calendar day. */
  date: string;
  slot: string;
  reason: string;
  status: BookingStatus;
  notes: string | null;
  /** The patient tapped "Change time" on WhatsApp. Cleared when staff confirm or cancel. */
  wantsNewTime: boolean;
  /** Where the booking came from. Display only. */
  source: BookingSource;
  /** utm_campaign, or the ad campaign staff typed. */
  campaign: string | null;
  /** First-touch details from the website. Null for staff bookings. */
  utm: Utm | null;
  /** Sample data from the demo seed. Reset demo data replaces these rows and never touches the rest. */
  isDemo: boolean;
};

export type NewBooking = Pick<Booking, "clinicSlug" | "name" | "phone" | "visitType" | "date" | "slot" | "reason"> & {
  notes?: string | null;
  /** Default "new". Staff bookings start confirmed. */
  status?: BookingStatus;
  /** Default "website". */
  source?: BookingSource;
  campaign?: string | null;
  utm?: Utm | null;
};

/** One patient on the Patients tab: every booking with the same phone number, rolled up. */
export type PatientSummary = {
  phone: string;
  /** The name on the newest booking. */
  name: string;
  /** The newest booking's id. The patient panel is opened by booking id, so no phone number goes in a URL. */
  latestBookingId: string;
  /** Bookings of any status. */
  bookings: number;
  /** Bookings marked visited. */
  visits: number;
  /** The earliest visited day, or null when the patient has not visited yet. */
  firstVisit: string | null;
  /** The latest booking day, any status. */
  lastDate: string;
  /** The source and campaign of the patient's first booking. */
  source: BookingSource;
  campaign: string | null;
  isDemo: boolean;
};

/** Front-desk notes on a patient, keyed by clinic and phone. */
export type PatientNotes = { notes: string; updatedAt: string };

/** Bookings per source. Sources with no bookings are left out. */
export type SourceCounts = Partial<Record<BookingSource, number>>;

/** A booking row the demo seed writes, with every field set, including the id and created time. */
export type DemoBooking = Omit<Booking, "isDemo">;
/** A message log row the demo seed writes. */
export type DemoMessage = Pick<MessageLog, "bookingId" | "kind" | "provider" | "toMasked" | "template" | "status" | "createdAt" | "updatedAt">;
/** Everything Reset demo data writes. */
export type DemoData = { bookings: DemoBooking[]; messages: DemoMessage[]; notes: { phone: string; notes: string; updatedAt: string }[] };

/**
 * clinic_alert goes to the clinic's own number on every new booking. confirmation, reminder and cancellation go to the patient.
 * inbound is a WhatsApp message from the patient. patient_confirmed is the patient tapping Confirm on WhatsApp.
 */
export const MESSAGE_KINDS = ["confirmation", "reminder", "cancellation", "clinic_alert", "inbound", "patient_confirmed"] as const;
export type MessageKind = (typeof MESSAGE_KINDS)[number];

export const MESSAGE_STATUSES = ["queued", "sent", "delivered", "read", "failed"] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

/** Who carried a message. Rows from before the Twilio build are "meta". */
export const MESSAGE_PROVIDERS = ["meta", "twilio", "fake"] as const;
export type MessageProvider = (typeof MESSAGE_PROVIDERS)[number];

/** One row of the messages table: a WhatsApp message sent, or tried, for a booking. */
export type MessageLog = {
  id: string;
  bookingId: string;
  kind: MessageKind;
  channel: "whatsapp";
  /** meta, twilio or fake. */
  provider: MessageProvider;
  /** Last 4 digits only, like "••••3210". Never the full number. */
  toMasked: string;
  /** Template name, or "text" when the provider sent plain text (Twilio sandbox). */
  template: string;
  /** The provider's message id: Meta's wamid... or Twilio's SM... sid. Null when the send failed before the provider answered. */
  providerMessageId: string | null;
  status: MessageStatus;
  error: string | null;
  /** ISO timestamps. */
  createdAt: string;
  updatedAt: string;
};

export type NewMessageLog = Pick<MessageLog, "bookingId" | "kind" | "toMasked" | "template" | "status"> & {
  /** Default "meta", the same as the database column. */
  provider?: MessageProvider;
  providerMessageId?: string | null;
  error?: string | null;
};

export interface BookingStore {
  readonly kind: "memory" | "postgres";
  create(input: NewBooking): Promise<Booking>;
  /** One booking, or null when no booking has that id. */
  get(id: string): Promise<Booking | null>;
  /**
   * Bookings from `from` to `to` (YYYY-MM-DD, both included, either may be left out), earliest day first.
   * `statuses` keeps only those statuses.
   */
  list(opts: { from?: string; to?: string; clinicSlug?: string; statuses?: readonly BookingStatus[] }): Promise<Booking[]>;
  /** Bookings waiting on staff: status new (any date) or the patient asked for a new time. Earliest day first. */
  needsAction(opts: { clinicSlug: string }): Promise<Booking[]>;
  /** Bookings whose name contains `q`, or whose phone contains the digits in `q`. Newest day first, at most `limit` (default 100). */
  search(opts: { clinicSlug: string; q: string; limit?: number }): Promise<Booking[]>;
  /** Every booking for a 10-digit phone, newest day first. */
  historyByPhone(opts: { clinicSlug: string; phone: string }): Promise<Booking[]>;
  /** Everyone who ever booked, grouped by phone, most recently booked first. */
  patients(opts: { clinicSlug: string }): Promise<PatientSummary[]>;
  /** Bookings created at or after `since` (ISO timestamp), counted by source. */
  sourceCounts(opts: { clinicSlug: string; since: string }): Promise<SourceCounts>;
  /** Returns the updated booking, or null when no booking has that id. Any status but new also clears wantsNewTime. */
  updateStatus(id: string, status: BookingStatus): Promise<Booking | null>;
  /** Moves a booking to a new day and slot, confirms it, and clears wantsNewTime. Null when no booking has that id. */
  reschedule(id: string, date: string, slot: string): Promise<Booking | null>;
  /** Front-desk notes for a phone, or null when there are none. */
  getNotes(opts: { clinicSlug: string; phone: string }): Promise<PatientNotes | null>;
  /** Saves the notes for a phone, replacing what was there. */
  setNotes(opts: { clinicSlug: string; phone: string; notes: string }): Promise<PatientNotes>;
  /**
   * Deletes every is_demo booking of the clinic (their messages go with them) and the notes on demo phones,
   * then writes `data` as is_demo rows. Never touches a booking with is_demo false. Postgres runs it in one transaction.
   */
  replaceDemoData(clinicSlug: string, data: DemoData): Promise<{ deleted: number; inserted: number }>;
  /** Sets the "wants a new time" flag. Returns the updated booking, or null when no booking has that id. */
  setWantsNewTime(id: string, value: boolean): Promise<Booking | null>;
  /**
   * The newest booking (by created time) for a 10-digit phone that is still open (new or confirmed)
   * and on or after `today` (YYYY-MM-DD, clinic time). Null when there is none.
   */
  findLatestByPhone(phone: string, today?: string): Promise<Booking | null>;
  /** Saves one message log row. */
  logMessage(input: NewMessageLog): Promise<MessageLog>;
  /**
   * Moves a message to a new status, found by the provider's message id. Status only moves forward
   * (queued, sent, delivered, read; failed beats all), because webhooks can arrive out of order.
   * Returns the row when it changed, or null when no row matched or the status was not newer.
   */
  updateMessageStatus(providerMessageId: string, status: MessageStatus, error?: string | null): Promise<MessageLog | null>;
  /** Every message for these bookings, newest first. */
  listMessagesForBookings(bookingIds: string[]): Promise<MessageLog[]>;
}

/** The latest WhatsApp message for a booking, as GET /api/bookings and the dashboard show it. No number, no template. */
export type WhatsAppSummary = Pick<MessageLog, "kind" | "status" | "error"> & {
  at: string;
  /** Who carried it. The dashboard shows "via Twilio" for twilio. */
  provider?: MessageProvider;
  /** True when nothing was sent because the booking is demo data. */
  skipped?: boolean;
};

/** A booking row on the dashboard. `whatsapp` is null when nothing was sent. */
export type DashboardBooking = Booking & { whatsapp?: WhatsAppSummary | null };

/** Rank used so a late "delivered" never overwrites "read". Failed wins over everything. */
export const MESSAGE_STATUS_RANK: Record<MessageStatus, number> = { queued: 0, sent: 1, delivered: 2, read: 3, failed: 4 };

export function isMessageStatus(value: unknown): value is MessageStatus {
  return typeof value === "string" && (MESSAGE_STATUSES as readonly string[]).includes(value);
}

/** Newest message per booking id. Input can be in any order. */
export function latestByBooking(messages: MessageLog[]): Map<string, MessageLog> {
  const out = new Map<string, MessageLog>();
  for (const m of messages) {
    const seen = out.get(m.bookingId);
    if (!seen || m.createdAt > seen.createdAt) out.set(m.bookingId, m);
  }
  return out;
}

export function isBookingStatus(value: unknown): value is BookingStatus {
  return typeof value === "string" && (BOOKING_STATUSES as readonly string[]).includes(value);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: string) {
  return UUID.test(value);
}

/** Sorts by day, then by created time. Both stores return this order. */
export function byDayThenCreated(a: Booking, b: Booking) {
  return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
}
