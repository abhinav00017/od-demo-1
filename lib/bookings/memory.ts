import { clinicToday } from "./clinicDay";
import { isDemoPhone } from "./demoPhones";
import { newViewToken } from "./viewToken";
import {
  byDayThenCreated,
  MESSAGE_STATUS_RANK,
  type Booking,
  type BookingStore,
  type DemoData,
  type MessageLog,
  type OptOutSource,
  type NewBooking,
  type PatientNotes,
  type PatientSummary,
  type SourceCounts,
} from "./types";

// Kept on globalThis so every route in one server process shares the same list.
// In `next dev` each route can load its own copy of this module.
const g = globalThis as typeof globalThis & {
  __lotusBookings?: Booking[];
  __lotusMessages?: MessageLog[];
  __lotusNotes?: Map<string, PatientNotes>;
  __lotusOptOuts?: Map<string, { at: string; source: OptOutSource }>;
  __lotusUnreachable?: Map<string, { at: string; reason: string }>;
  __lotusDemoSeeded?: boolean;
};

function rows(): Booking[] {
  g.__lotusBookings ??= [];
  return g.__lotusBookings;
}

function messages(): MessageLog[] {
  g.__lotusMessages ??= [];
  return g.__lotusMessages;
}

function notes(): Map<string, PatientNotes> {
  g.__lotusNotes ??= new Map();
  return g.__lotusNotes;
}

function optOuts() {
  g.__lotusOptOuts ??= new Map();
  return g.__lotusOptOuts;
}

function unreachable() {
  g.__lotusUnreachable ??= new Map();
  return g.__lotusUnreachable;
}

/** A booking still in play: new or confirmed. */
const isOpen = (b: Booking) => b.status === "new" || b.status === "confirmed";

/** The No-WhatsApp bookings staff still have to call: open, from today on, not confirmed by phone yet. */
export function needsCall(b: Booking, today: string) {
  return b.noWhatsApp && isOpen(b) && b.date >= today && !b.phoneConfirmedAt;
}

const noteKey = (clinicSlug: string, phone: string) => `${clinicSlug}:${phone}`;
const stamp = () => new Date().toISOString();
const copy = (b: Booking): Booking => ({ ...b, utm: b.utm ? { ...b.utm } : null });
/** Newest day first, then newest created first. */
const newestFirst = (a: Booking, b: Booking) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);

function replaceDemo(clinicSlug: string, data: DemoData) {
  const list = rows();
  const gone = new Set(list.filter((b) => b.isDemo && b.clinicSlug === clinicSlug).map((b) => b.id));
  g.__lotusBookings = list.filter((b) => !gone.has(b.id));
  g.__lotusMessages = messages().filter((m) => !gone.has(m.bookingId));
  for (const key of [...notes().keys()]) {
    const [slug, phone] = key.split(":");
    if (slug === clinicSlug && isDemoPhone(phone)) notes().delete(key);
  }
  for (const b of data.bookings) rows().push({ ...b, clinicSlug, isDemo: true });
  for (const m of data.messages) {
    messages().push({ ...m, id: crypto.randomUUID(), channel: "whatsapp", providerMessageId: null, error: m.error ?? null });
  }
  for (const n of data.notes) notes().set(noteKey(clinicSlug, n.phone), { notes: n.notes, updatedAt: n.updatedAt });
  // Opt-outs and No-WhatsApp marks on demo phones go with the demo data. Real phones are never touched.
  for (const map of [optOuts(), unreachable()]) for (const phone of [...map.keys()]) if (isDemoPhone(phone)) map.delete(phone);
  for (const o of data.optOuts ?? []) if (isDemoPhone(o.phone)) optOuts().set(o.phone, { at: o.optedOutAt, source: "demo" });
  return { deleted: gone.size, inserted: data.bookings.length };
}

/** In-memory store for dev and tests. Bookings vanish when the server restarts. */
export const memoryStore: BookingStore = {
  kind: "memory",

  async create(input: NewBooking) {
    const booking: Booking = {
      clinicSlug: input.clinicSlug,
      name: input.name,
      phone: input.phone,
      visitType: input.visitType,
      date: input.date,
      slot: input.slot,
      reason: input.reason,
      notes: input.notes ?? null,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: input.status ?? "new",
      wantsNewTime: false,
      source: input.source ?? "website",
      campaign: input.campaign ?? null,
      utm: input.utm ?? null,
      isDemo: false,
      viewToken: newViewToken(),
      awaitingPatient: false,
      noWhatsApp: false,
      phoneConfirmedAt: null,
      requestedDate: null,
      requestedSlot: null,
      consentAt: input.consent?.at ?? null,
      consentText: input.consent?.text ?? null,
      consentSource: input.consent?.source ?? null,
    };
    rows().push(booking);
    return copy(booking);
  },

  async get(id) {
    const found = rows().find((b) => b.id === id);
    return found ? copy(found) : null;
  },

  async list({ from, to, clinicSlug, statuses }) {
    return rows()
      .filter(
        (b) =>
          (!from || b.date >= from) &&
          (!to || b.date <= to) &&
          (!clinicSlug || b.clinicSlug === clinicSlug) &&
          (!statuses || statuses.includes(b.status)),
      )
      .sort(byDayThenCreated)
      .map(copy);
  },

  async needsAction({ clinicSlug, today = clinicToday() }) {
    return rows()
      .filter((b) => b.clinicSlug === clinicSlug && (b.status === "new" || b.wantsNewTime || needsCall(b, today)))
      .sort(byDayThenCreated)
      .map(copy);
  },

  async search({ clinicSlug, q, limit = 100 }) {
    const text = q.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    if (!text) return [];
    return rows()
      .filter((b) => b.clinicSlug === clinicSlug && (b.name.toLowerCase().includes(text) || (digits !== "" && b.phone.includes(digits))))
      .sort(newestFirst)
      .slice(0, limit)
      .map(copy);
  },

  async historyByPhone({ clinicSlug, phone }) {
    return rows()
      .filter((b) => b.clinicSlug === clinicSlug && b.phone === phone)
      .sort(newestFirst)
      .map(copy);
  },

  async patients({ clinicSlug }) {
    const byPhone = new Map<string, Booking[]>();
    for (const b of rows()) {
      if (b.clinicSlug !== clinicSlug) continue;
      byPhone.set(b.phone, [...(byPhone.get(b.phone) ?? []), b]);
    }
    const out: { summary: PatientSummary; lastCreated: string }[] = [];
    for (const [phone, list] of byPhone) {
      const byCreated = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const first = byCreated[0];
      const latest = byCreated[byCreated.length - 1];
      const visited = list.filter((b) => b.status === "visited").map((b) => b.date).sort();
      out.push({
        lastCreated: latest.createdAt,
        summary: {
          phone,
          name: latest.name,
          latestBookingId: latest.id,
          bookings: list.length,
          visits: visited.length,
          firstVisit: visited[0] ?? null,
          lastDate: list.map((b) => b.date).sort().at(-1)!,
          source: first.source,
          campaign: first.campaign,
          isDemo: list.some((b) => b.isDemo),
        },
      });
    }
    return out.sort((a, b) => b.lastCreated.localeCompare(a.lastCreated)).map((p) => p.summary);
  },

  async sourceCounts({ clinicSlug, since }) {
    const counts: SourceCounts = {};
    for (const b of rows()) {
      if (b.clinicSlug === clinicSlug && b.createdAt >= since) counts[b.source] = (counts[b.source] ?? 0) + 1;
    }
    return counts;
  },

  async updateStatus(id, status) {
    const found = rows().find((b) => b.id === id);
    if (!found) return null;
    found.status = status;
    if (status !== "new") {
      found.wantsNewTime = false;
      found.requestedDate = null;
      found.requestedSlot = null;
    }
    if (status === "cancelled") found.awaitingPatient = false;
    return copy(found);
  },

  async reschedule(id, date, slot, { awaitingPatient = false } = {}) {
    const found = rows().find((b) => b.id === id);
    if (!found) return null;
    found.date = date;
    found.slot = slot;
    found.status = "confirmed";
    found.wantsNewTime = false;
    found.requestedDate = null;
    found.requestedSlot = null;
    found.awaitingPatient = awaitingPatient;
    return copy(found);
  },

  async getByViewToken(token) {
    const found = rows().find((b) => b.viewToken !== null && b.viewToken === token);
    return found ? copy(found) : null;
  },

  async requestNewTime(id, date, slot) {
    const found = rows().find((b) => b.id === id);
    if (!found) return null;
    found.wantsNewTime = true;
    found.requestedDate = date;
    found.requestedSlot = slot;
    found.awaitingPatient = false;
    return copy(found);
  },

  async setAwaitingPatient(id, value) {
    const found = rows().find((b) => b.id === id);
    if (!found) return null;
    found.awaitingPatient = value;
    return copy(found);
  },

  async setNoWhatsApp(id, value) {
    const found = rows().find((b) => b.id === id);
    if (!found) return null;
    found.noWhatsApp = value;
    return copy(found);
  },

  async confirmByPhone(id) {
    const found = rows().find((b) => b.id === id);
    if (!found) return null;
    found.status = "confirmed";
    found.wantsNewTime = false;
    found.requestedDate = null;
    found.requestedSlot = null;
    found.phoneConfirmedAt = stamp();
    return copy(found);
  },

  async optOut(phone, source) {
    if (optOuts().has(phone)) return false;
    optOuts().set(phone, { at: stamp(), source });
    return true;
  },

  async optIn(phone) {
    return optOuts().delete(phone);
  },

  async markUnreachable(phone, reason) {
    if (!unreachable().has(phone)) unreachable().set(phone, { at: stamp(), reason });
  },

  async whatsappBlocks(phones) {
    const wanted = [...new Set(phones)];
    return { optedOut: wanted.filter((p) => optOuts().has(p)), unreachable: wanted.filter((p) => unreachable().has(p)) };
  },

  async setWantsNewTime(id, value) {
    const found = rows().find((b) => b.id === id);
    if (!found) return null;
    found.wantsNewTime = value;
    return copy(found);
  },

  async findLatestByPhone(phone, today = clinicToday()) {
    // Waiting for the patient first, then newest created. Same-millisecond rows keep insertion order, later first.
    const found = rows()
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => b.phone === phone && isOpen(b) && b.date >= today)
      .sort((x, y) => Number(y.b.awaitingPatient) - Number(x.b.awaitingPatient) || y.b.createdAt.localeCompare(x.b.createdAt) || y.i - x.i)[0];
    return found ? copy(found.b) : null;
  },

  async getNotes({ clinicSlug, phone }) {
    const found = notes().get(noteKey(clinicSlug, phone));
    return found ? { ...found } : null;
  },

  async setNotes({ clinicSlug, phone, notes: text }) {
    const saved = { notes: text, updatedAt: stamp() };
    notes().set(noteKey(clinicSlug, phone), saved);
    return { ...saved };
  },

  async replaceDemoData(clinicSlug, data) {
    return replaceDemo(clinicSlug, data);
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

/**
 * Fills the memory store with the demo clinic's sample data once per server process, on first use,
 * so the dashboard looks real in dev and on a deploy without a database. Postgres is seeded by
 * scripts/seed-clinic-demo.ts instead.
 */
export function seedMemoryDemoOnce(clinicSlug: string, build: () => DemoData) {
  if (g.__lotusDemoSeeded) return;
  g.__lotusDemoSeeded = true;
  replaceDemo(clinicSlug, build());
}

/** Tests only: empties the bookings, the message log and the notes. `seed: true` lets the next getStore() seed the demo data again. */
export function resetMemoryStore({ seed = false }: { seed?: boolean } = {}) {
  rows().length = 0;
  messages().length = 0;
  notes().clear();
  optOuts().clear();
  unreachable().clear();
  g.__lotusDemoSeeded = !seed;
}
