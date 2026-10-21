import { byDayThenCreated, MESSAGE_STATUS_RANK, type Booking, type BookingStore, type MessageLog, type NewBooking } from "./types";

// Kept on globalThis so every route in one server process shares the same list.
// In `next dev` each route can load its own copy of this module.
const g = globalThis as typeof globalThis & { __lotusBookings?: Booking[]; __lotusMessages?: MessageLog[] };

function rows(): Booking[] {
  g.__lotusBookings ??= [];
  return g.__lotusBookings;
}

function messages(): MessageLog[] {
  g.__lotusMessages ??= [];
  return g.__lotusMessages;
}

const stamp = () => new Date().toISOString();

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

  async logMessage(input) {
    const now = stamp();
    const row: MessageLog = {
      id: crypto.randomUUID(),
      bookingId: input.bookingId,
      kind: input.kind,
      channel: "whatsapp",
      provider: input.provider ?? "meta",
      toMasked: input.toMasked,
      template: input.template,
      providerMessageId: input.providerMessageId ?? null,
      status: input.status,
      error: input.error ?? null,
      createdAt: now,
      updatedAt: now,
    };
    messages().push(row);
    return { ...row };
  },

  async updateMessageStatus(providerMessageId, status, error) {
    const found = messages().find((m) => m.providerMessageId === providerMessageId);
    if (!found || MESSAGE_STATUS_RANK[status] <= MESSAGE_STATUS_RANK[found.status]) return null;
    found.status = status;
    found.error = error ?? null;
    found.updatedAt = stamp();
    return { ...found };
  },

  async listMessagesForBookings(bookingIds) {
    const ids = new Set(bookingIds);
    // Newest first. Rows written in the same millisecond keep insertion order, later first.
    return messages()
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => ids.has(m.bookingId))
      .sort((a, b) => b.m.createdAt.localeCompare(a.m.createdAt) || b.i - a.i)
      .map(({ m }) => ({ ...m }));
  },
};

/** Tests only: empties the bookings and the message log. */
export function resetMemoryStore() {
  rows().length = 0;
  messages().length = 0;
}
