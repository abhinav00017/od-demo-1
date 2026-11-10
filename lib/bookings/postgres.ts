import { neon } from "@neondatabase/serverless";
import { clinicToday } from "./clinicDay";
import type { ConsentSource } from "./consent";
import { DEMO_PHONE_PREFIX } from "./demoPhones";
import { newViewToken } from "./viewToken";
import {
  byDayThenCreated,
  MESSAGE_STATUS_RANK,
  type Booking,
  type BookingSource,
  type BookingStatus,
  type BookingStore,
  type MessageKind,
  type MessageLog,
  type MessageProvider,
  type MessageStatus,
  type NewBooking,
  type PatientSummary,
  type SourceCounts,
  type Utm,
} from "./types";

// date::text keeps the calendar day as written. A JS Date would shift it by the server's time zone.
const COLUMNS = `id, created_at, clinic_slug, name, phone, visit_type, date::text AS date, slot, reason, status, notes, wants_new_time, source, campaign, utm, is_demo,
  view_token, awaiting_patient, no_whatsapp, phone_confirmed_at, requested_date::text AS requested_date, requested_slot, consent_at, consent_text, consent_source`;

/** SQL for "a No-WhatsApp booking staff still have to call", with $n holding today. Matches needsCall in memory.ts. */
const NEEDS_CALL = (today: string) =>
  `(no_whatsapp AND status IN ('new', 'confirmed') AND date >= ${today}::date AND phone_confirmed_at IS NULL)`;

/** Escapes % and _ so a search for "50%" is not a wildcard. */
const likeText = (text: string) => text.replace(/[\\%_]/g, (c) => `\\${c}`);

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
  wants_new_time?: boolean | null;
  source?: BookingSource | null;
  campaign?: string | null;
  utm?: Utm | null;
  is_demo?: boolean | null;
  view_token?: string | null;
  awaiting_patient?: boolean | null;
  no_whatsapp?: boolean | null;
  phone_confirmed_at?: Date | string | null;
  requested_date?: string | null;
  requested_slot?: string | null;
  consent_at?: Date | string | null;
  consent_text?: string | null;
  consent_source?: ConsentSource | null;
};

const iso = (v: Date | string | null | undefined) => (v ? new Date(v).toISOString() : null);

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
    wantsNewTime: r.wants_new_time === true,
    source: r.source ?? "website",
    campaign: r.campaign ?? null,
    utm: r.utm ?? null,
    isDemo: r.is_demo === true,
    viewToken: r.view_token ?? null,
    awaitingPatient: r.awaiting_patient === true,
    noWhatsApp: r.no_whatsapp === true,
    phoneConfirmedAt: iso(r.phone_confirmed_at),
    requestedDate: r.requested_date ?? null,
    requestedSlot: r.requested_slot ?? null,
    consentAt: iso(r.consent_at),
    consentText: r.consent_text ?? null,
    consentSource: r.consent_source ?? null,
  };
}

type PatientRow = {
  phone: string;
  name: string;
  latest_id: string;
  bookings: number;
  visits: number;
  first_visit: string | null;
  last_date: string;
  source: BookingSource;
  campaign: string | null;
  is_demo: boolean;
};

const MESSAGE_COLUMNS = `id, booking_id, kind, channel, provider, to_masked, template, provider_message_id, status, error, created_at, updated_at`;

type MessageRow = {
  id: string;
  booking_id: string;
  kind: MessageKind;
  channel: "whatsapp";
  provider: MessageProvider;
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
    provider: r.provider,
    toMasked: r.to_masked,
    template: r.template,
    providerMessageId: r.provider_message_id,
    status: r.status,
    error: r.error,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

type NoteRow = { notes: string; updated_at: Date | string };
const toNotes = (r: NoteRow) => ({ notes: r.notes, updatedAt: new Date(r.updated_at).toISOString() });

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
        `INSERT INTO bookings (clinic_slug, name, phone, visit_type, date, slot, reason, notes, status, source, campaign, utm,
           view_token, consent_at, consent_text, consent_source)
         VALUES ($1, $2, $3, $4, $5::date, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14::timestamptz, $15, $16)
         RETURNING ${COLUMNS}`,
        [
          input.clinicSlug,
          input.name,
          input.phone,
          input.visitType,
          input.date,
          input.slot,
          input.reason,
          input.notes ?? null,
          input.status ?? "new",
          input.source ?? "website",
          input.campaign ?? null,
          input.utm ? JSON.stringify(input.utm) : null,
          newViewToken(),
          input.consent?.at ?? null,
          input.consent?.text ?? null,
          input.consent?.source ?? null,
        ],
      );
      return toBooking(row);
    },

    async get(id: string) {
      const [row] = await run(`SELECT ${COLUMNS} FROM bookings WHERE id = $1::uuid`, [id]);
      return row ? toBooking(row) : null;
    },

    async list({ from, to, clinicSlug, statuses }) {
      const where: string[] = [];
      const params: unknown[] = [];
      const add = (clause: (n: string) => string, value: unknown) => {
        params.push(value);
        where.push(clause(`$${params.length}`));
      };
      if (from) add((n) => `date >= ${n}::date`, from);
      if (to) add((n) => `date <= ${n}::date`, to);
      if (clinicSlug) add((n) => `clinic_slug = ${n}`, clinicSlug);
      if (statuses) add((n) => `status = ANY(${n}::text[])`, [...statuses]);
      const rows = await run(`SELECT ${COLUMNS} FROM bookings${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY date, created_at LIMIT 500`, params);
      return rows.map(toBooking).sort(byDayThenCreated);
    },

    async needsAction({ clinicSlug, today = clinicToday() }) {
      const rows = await run(
        `SELECT ${COLUMNS} FROM bookings WHERE clinic_slug = $1 AND (status = 'new' OR wants_new_time OR ${NEEDS_CALL("$2")}) ORDER BY date, created_at LIMIT 200`,
        [clinicSlug, today],
      );
      return rows.map(toBooking);
    },

    async search({ clinicSlug, q, limit = 100 }) {
      const text = q.trim();
      if (!text) return [];
      const digits = q.replace(/\D/g, "");
      const rows = await run(
        `SELECT ${COLUMNS} FROM bookings
         WHERE clinic_slug = $1 AND (name ILIKE $2 OR ($3 <> '' AND phone LIKE '%' || $3 || '%'))
         ORDER BY date DESC, created_at DESC LIMIT $4`,
        [clinicSlug, `%${likeText(text)}%`, digits, limit],
      );
      return rows.map(toBooking);
    },

    async historyByPhone({ clinicSlug, phone }) {
      const rows = await run(`SELECT ${COLUMNS} FROM bookings WHERE clinic_slug = $1 AND phone = $2 ORDER BY date DESC, created_at DESC LIMIT 200`, [
        clinicSlug,
        phone,
      ]);
      return rows.map(toBooking);
    },

    async patients({ clinicSlug }) {
      const rows = (await sql.query(
        `SELECT phone,
           (array_agg(name ORDER BY created_at DESC))[1] AS name,
           (array_agg(id::text ORDER BY created_at DESC))[1] AS latest_id,
           count(*)::int AS bookings,
           (count(*) FILTER (WHERE status = 'visited'))::int AS visits,
           (min(date) FILTER (WHERE status = 'visited'))::text AS first_visit,
           max(date)::text AS last_date,
           (array_agg(source ORDER BY created_at ASC))[1] AS source,
           (array_agg(campaign ORDER BY created_at ASC))[1] AS campaign,
           bool_or(is_demo) AS is_demo
         FROM bookings WHERE clinic_slug = $1
         GROUP BY phone ORDER BY max(created_at) DESC LIMIT 1000`,
        [clinicSlug],
      )) as PatientRow[];
      return rows.map(
        (r): PatientSummary => ({
          phone: r.phone,
          name: r.name,
          latestBookingId: r.latest_id,
          bookings: Number(r.bookings),
          visits: Number(r.visits),
          firstVisit: r.first_visit,
          lastDate: r.last_date,
          source: r.source ?? "website",
          campaign: r.campaign ?? null,
          isDemo: r.is_demo === true,
        }),
      );
    },

    async sourceCounts({ clinicSlug, since }) {
      const rows = (await sql.query(
        `SELECT source, count(*)::int AS count FROM bookings WHERE clinic_slug = $1 AND created_at >= $2::timestamptz GROUP BY source`,
        [clinicSlug, since],
      )) as { source: BookingSource; count: number }[];
      const counts: SourceCounts = {};
      for (const r of rows) counts[r.source] = Number(r.count);
      return counts;
    },

    async updateStatus(id: string, status: BookingStatus) {
      // Staff (or the patient) settling the booking answers any "wants a new time" request.
      const [row] = await run(
        `UPDATE bookings SET status = $2,
           wants_new_time = CASE WHEN $2 = 'new' THEN wants_new_time ELSE false END,
           requested_date = CASE WHEN $2 = 'new' THEN requested_date ELSE NULL END,
           requested_slot = CASE WHEN $2 = 'new' THEN requested_slot ELSE NULL END,
           awaiting_patient = CASE WHEN $2 = 'cancelled' THEN false ELSE awaiting_patient END
         WHERE id = $1::uuid RETURNING ${COLUMNS}`,
        [id, status],
      );
      return row ? toBooking(row) : null;
    },

    async reschedule(id: string, date: string, slot: string, { awaitingPatient = false } = {}) {
      const [row] = await run(
        `UPDATE bookings SET date = $2::date, slot = $3, status = 'confirmed', wants_new_time = false, requested_date = NULL, requested_slot = NULL,
           awaiting_patient = $4
         WHERE id = $1::uuid RETURNING ${COLUMNS}`,
        [id, date, slot, awaitingPatient],
      );
      return row ? toBooking(row) : null;
    },

    async getByViewToken(token: string) {
      const [row] = await run(`SELECT ${COLUMNS} FROM bookings WHERE view_token = $1`, [token]);
      return row ? toBooking(row) : null;
    },

    async requestNewTime(id: string, date: string, slot: string) {
      const [row] = await run(
        `UPDATE bookings SET wants_new_time = true, requested_date = $2::date, requested_slot = $3, awaiting_patient = false WHERE id = $1::uuid RETURNING ${COLUMNS}`,
        [id, date, slot],
      );
      return row ? toBooking(row) : null;
    },

    async setAwaitingPatient(id: string, value: boolean) {
      const [row] = await run(`UPDATE bookings SET awaiting_patient = $2 WHERE id = $1::uuid RETURNING ${COLUMNS}`, [id, value]);
      return row ? toBooking(row) : null;
    },

    async setNoWhatsApp(id: string, value: boolean) {
      const [row] = await run(`UPDATE bookings SET no_whatsapp = $2 WHERE id = $1::uuid RETURNING ${COLUMNS}`, [id, value]);
      return row ? toBooking(row) : null;
    },

    async confirmByPhone(id: string) {
      const [row] = await run(
        `UPDATE bookings SET status = 'confirmed', wants_new_time = false, requested_date = NULL, requested_slot = NULL, phone_confirmed_at = now()
         WHERE id = $1::uuid RETURNING ${COLUMNS}`,
        [id],
      );
      return row ? toBooking(row) : null;
    },

    async optOut(phone, source) {
      const rows = (await sql.query(`INSERT INTO whatsapp_optouts (phone, source) VALUES ($1, $2) ON CONFLICT (phone) DO NOTHING RETURNING phone`, [
        phone,
        source,
      ])) as unknown[];
      return rows.length > 0;
    },

    async optIn(phone) {
      const rows = (await sql.query(`DELETE FROM whatsapp_optouts WHERE phone = $1 RETURNING phone`, [phone])) as unknown[];
      return rows.length > 0;
    },

    async markUnreachable(phone, reason) {
      await sql.query(`INSERT INTO whatsapp_unreachable (phone, reason) VALUES ($1, $2) ON CONFLICT (phone) DO NOTHING`, [phone, reason]);
    },

    async whatsappBlocks(phones) {
      const wanted = [...new Set(phones)];
      if (!wanted.length) return { optedOut: [], unreachable: [] };
      const rows = (await sql.query(
        `SELECT phone, 'optout' AS kind FROM whatsapp_optouts WHERE phone = ANY($1::text[])
         UNION ALL SELECT phone, 'unreachable' AS kind FROM whatsapp_unreachable WHERE phone = ANY($1::text[])`,
        [wanted],
      )) as { phone: string; kind: "optout" | "unreachable" }[];
      return { optedOut: rows.filter((r) => r.kind === "optout").map((r) => r.phone), unreachable: rows.filter((r) => r.kind === "unreachable").map((r) => r.phone) };
    },

    async setWantsNewTime(id: string, value: boolean) {
      const [row] = await run(`UPDATE bookings SET wants_new_time = $2 WHERE id = $1::uuid RETURNING ${COLUMNS}`, [id, value]);
      return row ? toBooking(row) : null;
    },

    async getNotes({ clinicSlug, phone }) {
      const [row] = (await sql.query(`SELECT notes, updated_at FROM patient_notes WHERE clinic_slug = $1 AND phone = $2`, [clinicSlug, phone])) as NoteRow[];
      return row ? toNotes(row) : null;
    },

    async setNotes({ clinicSlug, phone, notes }) {
      const [row] = (await sql.query(
        `INSERT INTO patient_notes (clinic_slug, phone, notes, updated_at) VALUES ($1, $2, $3, now())
         ON CONFLICT (clinic_slug, phone) DO UPDATE SET notes = EXCLUDED.notes, updated_at = now()
         RETURNING notes, updated_at`,
        [clinicSlug, phone, notes],
      )) as NoteRow[];
      return toNotes(row);
    },

    async replaceDemoData(clinicSlug, data) {
      // One transaction: the old demo rows go and the new ones arrive together, or nothing changes.
      // Messages of deleted bookings go with them (ON DELETE CASCADE). Only is_demo rows and demo-phone notes are deleted.
      const bookings = data.bookings.map((b) => ({
        id: b.id,
        created_at: b.createdAt,
        name: b.name,
        phone: b.phone,
        visit_type: b.visitType,
        date: b.date,
        slot: b.slot,
        reason: b.reason,
        status: b.status,
        notes: b.notes,
        wants_new_time: b.wantsNewTime,
        source: b.source,
        campaign: b.campaign,
        utm: b.utm,
        view_token: b.viewToken,
        awaiting_patient: b.awaitingPatient,
        no_whatsapp: b.noWhatsApp,
        phone_confirmed_at: b.phoneConfirmedAt,
        requested_date: b.requestedDate,
        requested_slot: b.requestedSlot,
        consent_at: b.consentAt,
        consent_text: b.consentText,
        consent_source: b.consentSource,
      }));
      const messages = data.messages.map((m) => ({
        booking_id: m.bookingId,
        kind: m.kind,
        provider: m.provider,
        to_masked: m.toMasked,
        template: m.template,
        status: m.status,
        error: m.error ?? null,
        created_at: m.createdAt,
        updated_at: m.updatedAt,
      }));
      const notes = data.notes.map((n) => ({ phone: n.phone, notes: n.notes, updated_at: n.updatedAt }));
      // Only demo numbers, even if the data says otherwise.
      const optOuts = (data.optOuts ?? []).filter((o) => o.phone.startsWith(DEMO_PHONE_PREFIX)).map((o) => ({ phone: o.phone, opted_out_at: o.optedOutAt }));
      const results = await sql.transaction([
        sql.query(`DELETE FROM bookings WHERE clinic_slug = $1 AND is_demo = true RETURNING id`, [clinicSlug]),
        sql.query(`DELETE FROM patient_notes WHERE clinic_slug = $1 AND phone LIKE $2`, [clinicSlug, `${DEMO_PHONE_PREFIX}%`]),
        sql.query(
          `INSERT INTO bookings (id, created_at, clinic_slug, name, phone, visit_type, date, slot, reason, status, notes, wants_new_time, source, campaign, utm, is_demo,
             view_token, awaiting_patient, no_whatsapp, phone_confirmed_at, requested_date, requested_slot, consent_at, consent_text, consent_source)
           SELECT x.id, x.created_at, $1, x.name, x.phone, x.visit_type, x.date, x.slot, x.reason, x.status, x.notes, x.wants_new_time, x.source, x.campaign, x.utm, true,
             x.view_token, COALESCE(x.awaiting_patient, false), COALESCE(x.no_whatsapp, false), x.phone_confirmed_at, x.requested_date, x.requested_slot,
             x.consent_at, x.consent_text, x.consent_source
           FROM jsonb_to_recordset($2::jsonb) AS x(id uuid, created_at timestamptz, name text, phone text, visit_type text, date date, slot text, reason text,
             status text, notes text, wants_new_time boolean, source text, campaign text, utm jsonb, view_token text, awaiting_patient boolean,
             no_whatsapp boolean, phone_confirmed_at timestamptz, requested_date date, requested_slot text, consent_at timestamptz, consent_text text,
             consent_source text)
           RETURNING id`,
          [clinicSlug, JSON.stringify(bookings)],
        ),
        sql.query(
          `INSERT INTO messages (booking_id, kind, channel, provider, to_masked, template, status, error, created_at, updated_at)
           SELECT x.booking_id, x.kind, 'whatsapp', x.provider, x.to_masked, x.template, x.status, x.error, x.created_at, x.updated_at
           FROM jsonb_to_recordset($1::jsonb) AS x(booking_id uuid, kind text, provider text, to_masked text, template text, status text,
             error text, created_at timestamptz, updated_at timestamptz)`,
          [JSON.stringify(messages)],
        ),
        sql.query(
          `INSERT INTO patient_notes (clinic_slug, phone, notes, updated_at)
           SELECT $1, x.phone, x.notes, x.updated_at FROM jsonb_to_recordset($2::jsonb) AS x(phone text, notes text, updated_at timestamptz)
           ON CONFLICT (clinic_slug, phone) DO UPDATE SET notes = EXCLUDED.notes, updated_at = EXCLUDED.updated_at`,
          [clinicSlug, JSON.stringify(notes)],
        ),
        sql.query(`DELETE FROM whatsapp_optouts WHERE phone LIKE $1`, [`${DEMO_PHONE_PREFIX}%`]),
        sql.query(`DELETE FROM whatsapp_unreachable WHERE phone LIKE $1`, [`${DEMO_PHONE_PREFIX}%`]),
        sql.query(
          `INSERT INTO whatsapp_optouts (phone, opted_out_at, source)
           SELECT x.phone, x.opted_out_at, 'demo' FROM jsonb_to_recordset($1::jsonb) AS x(phone text, opted_out_at timestamptz)
           ON CONFLICT (phone) DO NOTHING`,
          [JSON.stringify(optOuts)],
        ),
      ]);
      const [deleted, , inserted] = results as unknown[][];
      return { deleted: deleted.length, inserted: inserted.length };
    },

    async findLatestByPhone(phone: string, today = clinicToday()) {
      const [row] = await run(
        `SELECT ${COLUMNS} FROM bookings WHERE phone = $1 AND status IN ('new', 'confirmed') AND date >= $2::date ORDER BY awaiting_patient DESC, created_at DESC LIMIT 1`,
        [phone, today],
      );
      return row ? toBooking(row) : null;
    },

    async logMessage(input) {
      const [row] = await runMessages(
        `INSERT INTO messages (booking_id, kind, channel, to_masked, template, provider_message_id, status, error, provider)
         VALUES ($1::uuid, $2, 'whatsapp', $3, $4, $5, $6, $7, $8)
         RETURNING ${MESSAGE_COLUMNS}`,
        [input.bookingId, input.kind, input.toMasked, input.template, input.providerMessageId ?? null, input.status, input.error ?? null, input.provider ?? "meta"],
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
