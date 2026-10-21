import { neon } from "@neondatabase/serverless";
import {
  byDayThenCreated,
  MESSAGE_STATUS_RANK,
  type Booking,
  type BookingStatus,
  type BookingStore,
  type MessageKind,
  type MessageLog,
  type MessageStatus,
  type NewBooking,
} from "./types";

// date::text keeps the calendar day as written. A JS Date would shift it by the server's time zone.
const COLUMNS = `id, created_at, clinic_slug, name, phone, visit_type, date::text AS date, slot, reason, status, notes`;

type Row = {
  id: string;
  created_at: Date | string;
  clinic_slug: string;
  name: string;
  phone: string;
  visit_type: string;
  date: string;
  slot: string;
  reason: string;
  status: BookingStatus;
  notes: string | null;
};

function toBooking(r: Row): Booking {
  return {
    id: r.id,
    createdAt: new Date(r.created_at).toISOString(),
    clinicSlug: r.clinic_slug,
    name: r.name,
    phone: r.phone,
    visitType: r.visit_type,
    date: r.date,
    slot: r.slot,
    reason: r.reason,
    status: r.status,
    notes: r.notes,
  };
}

const MESSAGE_COLUMNS = `id, booking_id, kind, channel, to_masked, template, provider_message_id, status, error, created_at, updated_at`;

type MessageRow = {
  id: string;
  booking_id: string;
  kind: MessageKind;
  channel: "whatsapp";
  to_masked: string;
  template: string;
  provider_message_id: string | null;
  status: MessageStatus;
  error: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

function toMessage(r: MessageRow): MessageLog {
  return {
    id: r.id,
    bookingId: r.booking_id,
    kind: r.kind,
    channel: r.channel,
    toMasked: r.to_masked,
    template: r.template,
    providerMessageId: r.provider_message_id,
    status: r.status,
    error: r.error,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

// The same order as MESSAGE_STATUS_RANK, written out for SQL.
const rankSql = (expr: string) =>
  `CASE ${expr} ${Object.entries(MESSAGE_STATUS_RANK)
    .map(([status, rank]) => `WHEN '${status}' THEN ${rank}`)
    .join(" ")} END`;

/** Postgres store over Neon's HTTP driver. Plain SQL with $n parameters, no ORM. */
export function postgresStore(databaseUrl: string): BookingStore {
  const sql = neon(databaseUrl);
  const run = async (text: string, params: unknown[]) => (await sql.query(text, params)) as Row[];
  const runMessages = async (text: string, params: unknown[]) => (await sql.query(text, params)) as MessageRow[];

  return {
    kind: "postgres",

    async create(input: NewBooking) {
      const [row] = await run(
        `INSERT INTO bookings (clinic_slug, name, phone, visit_type, date, slot, reason, notes)
         VALUES ($1, $2, $3, $4, $5::date, $6, $7, $8)
         RETURNING ${COLUMNS}`,
        [input.clinicSlug, input.name, input.phone, input.visitType, input.date, input.slot, input.reason, input.notes ?? null],
      );
      return toBooking(row);
    },

    async list({ from, clinicSlug }) {
      const rows = clinicSlug
        ? await run(`SELECT ${COLUMNS} FROM bookings WHERE date >= $1::date AND clinic_slug = $2 ORDER BY date, created_at LIMIT 500`, [from, clinicSlug])
        : await run(`SELECT ${COLUMNS} FROM bookings WHERE date >= $1::date ORDER BY date, created_at LIMIT 500`, [from]);
      return rows.map(toBooking).sort(byDayThenCreated);
    },

    async updateStatus(id: string, status: BookingStatus) {
      const [row] = await run(`UPDATE bookings SET status = $2 WHERE id = $1::uuid RETURNING ${COLUMNS}`, [id, status]);
      return row ? toBooking(row) : null;
    },

    async logMessage(input) {
      const [row] = await runMessages(
        `INSERT INTO messages (booking_id, kind, channel, to_masked, template, provider_message_id, status, error)
         VALUES ($1::uuid, $2, 'whatsapp', $3, $4, $5, $6, $7)
         RETURNING ${MESSAGE_COLUMNS}`,
        [input.bookingId, input.kind, input.toMasked, input.template, input.providerMessageId ?? null, input.status, input.error ?? null],
      );
      return toMessage(row);
    },

    async updateMessageStatus(providerMessageId, status, error) {
      const [row] = await runMessages(
        `UPDATE messages SET status = $2, error = $3, updated_at = now()
         WHERE provider_message_id = $1 AND ${rankSql("status")} < ${rankSql("$2::text")}
         RETURNING ${MESSAGE_COLUMNS}`,
        [providerMessageId, status, error ?? null],
      );
      return row ? toMessage(row) : null;
    },

    async listMessagesForBookings(bookingIds) {
      if (bookingIds.length === 0) return [];
      const rows = await runMessages(`SELECT ${MESSAGE_COLUMNS} FROM messages WHERE booking_id = ANY($1::uuid[]) ORDER BY created_at DESC`, [bookingIds]);
      return rows.map(toMessage);
    },
  };
}
