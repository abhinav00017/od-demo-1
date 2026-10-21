import { neon } from "@neondatabase/serverless";
import { byDayThenCreated, type Booking, type BookingStatus, type BookingStore, type NewBooking } from "./types";

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

/** Postgres store over Neon's HTTP driver. Plain SQL with $n parameters, no ORM. */
export function postgresStore(databaseUrl: string): BookingStore {
  const sql = neon(databaseUrl);
  const run = async (text: string, params: unknown[]) => (await sql.query(text, params)) as Row[];

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
  };
}
