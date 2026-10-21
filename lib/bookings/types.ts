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

export interface BookingStore {
  readonly kind: "memory" | "postgres";
  create(input: NewBooking): Promise<Booking>;
  /** Bookings on or after `from` (YYYY-MM-DD), earliest day first. */
  list(opts: { from: string; clinicSlug?: string }): Promise<Booking[]>;
  /** Returns the updated booking, or null when no booking has that id. */
  updateStatus(id: string, status: BookingStatus): Promise<Booking | null>;
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
