import { byDayThenCreated, type Booking, type BookingStore, type NewBooking } from "./types";

// Kept on globalThis so every route in one server process shares the same list.
// In `next dev` each route can load its own copy of this module.
const g = globalThis as typeof globalThis & { __lotusBookings?: Booking[] };

function rows(): Booking[] {
  g.__lotusBookings ??= [];
  return g.__lotusBookings;
}

/** In-memory store for dev and tests. Bookings vanish when the server restarts. */
export const memoryStore: BookingStore = {
  kind: "memory",

  async create(input: NewBooking) {
    const booking: Booking = {
      ...input,
      notes: input.notes ?? null,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: "new",
    };
    rows().push(booking);
    return { ...booking };
  },

  async list({ from, clinicSlug }) {
    return rows()
      .filter((b) => b.date >= from && (!clinicSlug || b.clinicSlug === clinicSlug))
      .sort(byDayThenCreated)
      .map((b) => ({ ...b }));
  },

  async updateStatus(id, status) {
    const found = rows().find((b) => b.id === id);
    if (!found) return null;
    found.status = status;
    return { ...found };
  },
};

/** Tests only: empties the list. */
export function resetMemoryStore() {
  rows().length = 0;
}
