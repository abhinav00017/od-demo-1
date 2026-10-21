export const BOOKING_STATUSES = ["new", "confirmed", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

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
};

export type NewBooking = Pick<Booking, "clinicSlug" | "name" | "phone" | "visitType" | "date" | "slot" | "reason"> & {
  notes?: string | null;
};

/** clinic_alert goes to the clinic's own number on every new booking. The rest go to the patient. */
export const MESSAGE_KINDS = ["confirmation", "reminder", "cancellation", "clinic_alert"] as const;
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
  /** Bookings on or after `from` (YYYY-MM-DD), earliest day first. */
  list(opts: { from: string; clinicSlug?: string }): Promise<Booking[]>;
  /** Returns the updated booking, or null when no booking has that id. */
  updateStatus(id: string, status: BookingStatus): Promise<Booking | null>;
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
