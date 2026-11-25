import { neon } from "@neondatabase/serverless";
import type { Utm } from "@/lib/bookings/sources";
import { referenceOf, type Enquiry, type EnquiryStatus, type EnquiryStore } from "./types";

/** Runs one statement and returns its rows. Neon's HTTP driver in the app; PGlite in tests. */
export type Query = (text: string, params: unknown[]) => Promise<Record<string, unknown>[]>;

type Stamp = Date | string;
const iso = (v: Stamp) => new Date(v).toISOString();

// date::text keeps the cafe's calendar day as typed, whatever the server's time zone. org_id is filled by the
// database from cafe_slug (schema.sql), so it is never written here.
const COLUMNS = `id, created_at, cafe_slug, venue, event_type, date::text AS date, slot, guests, name, phone, notes, status, status_updated_at, source, campaign, utm, channel, is_demo`;

type Row = {
  id: string;
  created_at: Stamp;
  cafe_slug: string;
  venue: Enquiry["venue"];
  event_type: Enquiry["eventType"];
  date: string;
  slot: string;
  guests: number | string;
  name: string;
  phone: string;
  notes: string;
  status: EnquiryStatus;
  status_updated_at: Stamp | null;
  source: Enquiry["source"];
  campaign: string | null;
  utm: Utm | string | null;
  channel: Enquiry["channel"];
  is_demo: boolean;
};

const toEnquiry = (r: Row): Enquiry => ({
  id: r.id,
  reference: referenceOf(r.id),
  createdAt: iso(r.created_at),
  cafeSlug: r.cafe_slug,
  venue: r.venue,
  eventType: r.event_type,
  date: r.date,
  slot: r.slot,
  guests: Number(r.guests),
  name: r.name,
  phone: r.phone,
  notes: r.notes,
  status: r.status,
  statusUpdatedAt: r.status_updated_at === null ? null : iso(r.status_updated_at),
  source: r.source,
  campaign: r.campaign,
  // Drivers hand jsonb back parsed; a string means a driver that did not.
  utm: typeof r.utm === "string" ? (JSON.parse(r.utm) as Utm) : r.utm,
  channel: r.channel,
  isDemo: r.is_demo,
});

/** The list shows the newest enquiries; a demo never needs more than this. */
const LIST_LIMIT = 500;

/** Enquiries in Postgres (the cafe_event_enquiries table). Every read and write names the cafe. */
export function postgresEnquiryStore(query: Query): EnquiryStore {
  const rows = async (text: string, params: unknown[]) => (await query(text, params)) as unknown as Row[];
  return {
    kind: "postgres",

    async create(e) {
      const [row] = await rows(
        `INSERT INTO cafe_event_enquiries (cafe_slug, venue, event_type, date, slot, guests, name, phone, notes, source, campaign, utm, channel)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13) RETURNING ${COLUMNS}`,
        [e.cafeSlug, e.venue, e.eventType, e.date, e.slot, e.guests, e.name, e.phone, e.notes, e.source, e.campaign, e.utm ? JSON.stringify(e.utm) : null, e.channel],
      );
      return toEnquiry(row);
    },

    async list(cafeSlug) {
      const list = await rows(`SELECT ${COLUMNS} FROM cafe_event_enquiries WHERE cafe_slug = $1 ORDER BY created_at DESC LIMIT ${LIST_LIMIT}`, [cafeSlug]);
      return list.map(toEnquiry);
    },

    async setStatus(cafeSlug, id, status) {
      const [row] = await rows(
        `UPDATE cafe_event_enquiries SET status = $3, status_updated_at = now() WHERE cafe_slug = $1 AND id = $2 RETURNING ${COLUMNS}`,
        [cafeSlug, id, status],
      );
      return row ? toEnquiry(row) : undefined;
    },

    // One statement, so the delete and the inserts happen together: Neon's HTTP driver runs one statement per call.
    async replaceDemo(cafeSlug, demo) {
      const payload = demo.map((d) => ({
        created_at: d.createdAt,
        venue: d.venue,
        event_type: d.eventType,
        date: d.date,
        slot: d.slot,
        guests: d.guests,
        name: d.name,
        phone: d.phone,
        notes: d.notes,
        status: d.status,
        status_updated_at: d.statusUpdatedAt,
        source: d.source,
        campaign: d.campaign,
        utm: d.utm,
        channel: d.channel,
      }));
      const [result] = (await query(
        `WITH gone AS (
           DELETE FROM cafe_event_enquiries WHERE cafe_slug = $1 AND is_demo RETURNING 1
         ), added AS (
           INSERT INTO cafe_event_enquiries (cafe_slug, created_at, venue, event_type, date, slot, guests, name, phone, notes, status, status_updated_at, source, campaign, utm, channel, is_demo)
           SELECT $1, x.created_at, x.venue, x.event_type, x.date, x.slot, x.guests, x.name, x.phone, x.notes, x.status, x.status_updated_at, x.source, x.campaign, x.utm, x.channel, true
           FROM jsonb_to_recordset($2::jsonb) AS x(created_at timestamptz, venue text, event_type text, date date, slot text, guests integer, name text, phone text,
             notes text, status text, status_updated_at timestamptz, source text, campaign text, utm jsonb, channel text)
           RETURNING 1
         )
         SELECT (SELECT count(*) FROM gone)::int AS deleted, (SELECT count(*) FROM added)::int AS inserted`,
        [cafeSlug, JSON.stringify(payload)],
      )) as { deleted: number; inserted: number }[];
      return { deleted: Number(result.deleted), inserted: Number(result.inserted) };
    },
  };
}

/** The Neon HTTP driver as a Query. */
export function neonQuery(url: string): Query {
  const sql = neon(url);
  return (text, params) => sql.query(text, params) as Promise<Record<string, unknown>[]>;
}
