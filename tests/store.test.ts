import { beforeEach, describe, expect, it } from "vitest";
import { getStore } from "@/lib/bookings";
import { generateDemoData } from "@/lib/bookings/demoSeed";
import { memoryStore, resetMemoryStore } from "@/lib/bookings/memory";
import type { BookingStore, NewBooking } from "@/lib/bookings/types";

const base: NewBooking = {
  clinicSlug: "lotus-clinic",
  name: "Priya Sharma",
  phone: "9876543210",
  visitType: "clinic",
  date: "2026-10-22",
  slot: "Morning, 10 am – 1 pm",
  reason: "Pregnancy care",
};

// The same checks would run against the postgres store; only memory runs here, with no database.
function storeContract(name: string, store: BookingStore, reset: () => void) {
  describe(`${name} store`, () => {
    beforeEach(reset);

    it("creates a booking with an id, a timestamp and status new", async () => {
      const b = await store.create(base);
      expect(b.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(Number.isNaN(Date.parse(b.createdAt))).toBe(false);
      expect(b).toMatchObject({ ...base, status: "new", notes: null });
    });

    it("lists from a day onward, earliest day first", async () => {
      await store.create({ ...base, date: "2026-10-24", name: "Later" });
      await store.create({ ...base, date: "2026-10-19", name: "Past" });
      await store.create({ ...base, date: "2026-10-21", name: "Sooner" });
      const list = await store.list({ from: "2026-10-20" });
      expect(list.map((b) => b.name)).toEqual(["Sooner", "Later"]);
    });

    it("filters by clinic", async () => {
      await store.create(base);
      await store.create({ ...base, clinicSlug: "other-clinic" });
      expect(await store.list({ from: "2026-10-01", clinicSlug: "lotus-clinic" })).toHaveLength(1);
      expect(await store.list({ from: "2026-10-01" })).toHaveLength(2);
    });

    it("updates the status and returns the new row", async () => {
      const b = await store.create(base);
      const updated = await store.updateStatus(b.id, "confirmed");
      expect(updated?.status).toBe("confirmed");
      expect((await store.list({ from: base.date }))[0].status).toBe("confirmed");
    });

    it("returns null for an unknown id", async () => {
      expect(await store.updateStatus("00000000-0000-4000-8000-000000000000", "cancelled")).toBeNull();
    });

    it("records the provider on each message, meta when not given", async () => {
      const a = await store.create(base);
      const old = await store.logMessage({ bookingId: a.id, kind: "confirmation", toMasked: "••••3210", template: "hello_world", status: "sent" });
      const tw = await store.logMessage({ bookingId: a.id, kind: "reminder", provider: "twilio", toMasked: "••••3210", template: "text", status: "sent", providerMessageId: "SM1" });
      expect(old.provider).toBe("meta");
      expect(tw.provider).toBe("twilio");
      expect((await store.listMessagesForBookings([a.id])).map((m) => m.provider).sort()).toEqual(["meta", "twilio"]);
    });

    it("logs messages and lists them newest first for the asked bookings", async () => {
      const a = await store.create(base);
      const b = await store.create({ ...base, name: "Other" });
      await store.logMessage({ bookingId: a.id, kind: "confirmation", toMasked: "••••3210", template: "hello_world", status: "sent", providerMessageId: "wamid.1" });
      await store.logMessage({ bookingId: a.id, kind: "reminder", toMasked: "••••3210", template: "hello_world", status: "failed", error: "131030: not allowed" });
      await store.logMessage({ bookingId: b.id, kind: "confirmation", toMasked: "••••3210", template: "hello_world", status: "sent" });
      const list = await store.listMessagesForBookings([a.id]);
      expect(list.map((m) => m.kind)).toEqual(["reminder", "confirmation"]);
      expect(list[0]).toMatchObject({ channel: "whatsapp", status: "failed", error: "131030: not allowed", providerMessageId: null });
      expect(await store.listMessagesForBookings([])).toEqual([]);
    });

    it("moves a message status forward only, by provider id", async () => {
      const a = await store.create(base);
      await store.logMessage({ bookingId: a.id, kind: "confirmation", toMasked: "••••3210", template: "hello_world", status: "sent", providerMessageId: "wamid.2" });
      expect((await store.updateMessageStatus("wamid.2", "read"))?.status).toBe("read");
      expect(await store.updateMessageStatus("wamid.2", "delivered")).toBeNull();
      expect((await store.updateMessageStatus("wamid.2", "failed", "131026: undeliverable"))?.error).toBe("131026: undeliverable");
      expect(await store.updateMessageStatus("wamid.unknown", "read")).toBeNull();
    });

    it("findLatestByPhone: newest open booking on or after today, for that phone only", async () => {
      expect(await store.findLatestByPhone(base.phone, "2026-10-22")).toBeNull();
      const older = await store.create({ ...base, date: "2026-10-23", name: "Older" });
      const newer = await store.create({ ...base, date: "2026-10-22", name: "Newer" });
      const past = await store.create({ ...base, date: "2026-10-21", name: "Past" });
      await store.create({ ...base, phone: "9123456789", name: "Other phone" });
      expect((await store.findLatestByPhone(base.phone, "2026-10-22"))?.id).toBe(newer.id);
      await store.updateStatus(newer.id, "cancelled");
      expect((await store.findLatestByPhone(base.phone, "2026-10-22"))?.id).toBe(older.id);
      await store.updateStatus(older.id, "confirmed");
      expect((await store.findLatestByPhone(base.phone, "2026-10-22"))?.id).toBe(older.id);
      expect((await store.findLatestByPhone(base.phone, "2026-10-21"))?.id).toBe(past.id);
      expect(await store.findLatestByPhone(base.phone, "2026-10-24")).toBeNull();
    });

    it("sets wantsNewTime, and confirm or cancel clears it", async () => {
      const b = await store.create(base);
      expect(b.wantsNewTime).toBe(false);
      expect((await store.setWantsNewTime(b.id, true))?.wantsNewTime).toBe(true);
      expect((await store.updateStatus(b.id, "new"))?.wantsNewTime).toBe(true);
      expect((await store.updateStatus(b.id, "confirmed"))?.wantsNewTime).toBe(false);
      await store.setWantsNewTime(b.id, true);
      expect((await store.updateStatus(b.id, "cancelled"))?.wantsNewTime).toBe(false);
      expect(await store.setWantsNewTime("00000000-0000-4000-8000-000000000000", true)).toBeNull();
    });

    it("defaults new bookings to source website, no campaign, not demo; takes status and attribution when given", async () => {
      const web = await store.create(base);
      expect(web).toMatchObject({ source: "website", campaign: null, utm: null, isDemo: false, status: "new" });
      const staff = await store.create({ ...base, status: "confirmed", source: "walk_in" });
      expect(staff).toMatchObject({ status: "confirmed", source: "walk_in" });
      const ad = await store.create({ ...base, source: "google_ads", campaign: "pcos-awareness", utm: { gclid: "abc", utm_campaign: "pcos-awareness" } });
      expect(await store.get(ad.id)).toMatchObject({ source: "google_ads", campaign: "pcos-awareness", utm: { gclid: "abc" } });
      expect(await store.get("00000000-0000-4000-8000-000000000000")).toBeNull();
    });

    it("lists by date range (both ends included) and by status", async () => {
      const a = await store.create({ ...base, date: "2026-10-01" });
      const b = await store.create({ ...base, date: "2026-10-10" });
      await store.create({ ...base, date: "2026-10-20" });
      await store.updateStatus(a.id, "visited");
      await store.updateStatus(b.id, "no_show");
      expect((await store.list({ from: "2026-10-01", to: "2026-10-10" })).map((x) => x.date)).toEqual(["2026-10-01", "2026-10-10"]);
      expect((await store.list({ to: "2026-10-15", statuses: ["visited"] })).map((x) => x.id)).toEqual([a.id]);
      expect((await store.list({ statuses: ["visited", "no_show"] })).map((x) => x.status)).toEqual(["visited", "no_show"]);
    });

    it("visited and no_show are statuses that clear wantsNewTime", async () => {
      const b = await store.create(base);
      await store.setWantsNewTime(b.id, true);
      expect(await store.updateStatus(b.id, "visited")).toMatchObject({ status: "visited", wantsNewTime: false });
      expect((await store.updateStatus(b.id, "no_show"))?.status).toBe("no_show");
    });

    it("needsAction: status new on any day, or wants a new time", async () => {
      const fresh = await store.create({ ...base, date: "2026-09-01" });
      const confirmed = await store.create(base);
      await store.updateStatus(confirmed.id, "confirmed");
      const moving = await store.create({ ...base, date: "2026-10-25" });
      await store.updateStatus(moving.id, "confirmed");
      await store.setWantsNewTime(moving.id, true);
      await store.create({ ...base, clinicSlug: "other-clinic" });
      expect((await store.needsAction({ clinicSlug: "lotus-clinic" })).map((b) => b.id)).toEqual([fresh.id, moving.id]);
    });

    it("searches by name (any case) or by phone digits, newest day first", async () => {
      await store.create({ ...base, name: "Lakshmi Varma", date: "2026-10-01" });
      await store.create({ ...base, name: "Lakshmi Varma", date: "2026-10-05" });
      await store.create({ ...base, name: "Divya", phone: "9123456789" });
      expect((await store.search({ clinicSlug: "lotus-clinic", q: "lakshmi" })).map((b) => b.date)).toEqual(["2026-10-05", "2026-10-01"]);
      expect((await store.search({ clinicSlug: "lotus-clinic", q: "6789" })).map((b) => b.name)).toEqual(["Divya"]);
      expect(await store.search({ clinicSlug: "lotus-clinic", q: "nobody" })).toEqual([]);
      expect(await store.search({ clinicSlug: "lotus-clinic", q: " " })).toEqual([]);
      expect(await store.search({ clinicSlug: "lotus-clinic", q: "lakshmi", limit: 1 })).toHaveLength(1);
    });

    it("patient history by phone, newest first, and the patients list grouped by phone", async () => {
      const first = await store.create({ ...base, date: "2026-09-01", name: "Priya S", source: "google_ads", campaign: "pregnancy-care-vizag" });
      await store.updateStatus(first.id, "visited");
      const second = await store.create({ ...base, date: "2026-10-01" });
      await store.updateStatus(second.id, "visited");
      const third = await store.create({ ...base, date: "2026-10-30", name: "Priya Sharma" });
      await store.create({ ...base, name: "Divya", phone: "9123456789" });
      const history = await store.historyByPhone({ clinicSlug: "lotus-clinic", phone: base.phone });
      expect(history.map((b) => b.date)).toEqual(["2026-10-30", "2026-10-01", "2026-09-01"]);
      const patients = await store.patients({ clinicSlug: "lotus-clinic" });
      expect(patients).toHaveLength(2);
      expect(patients.find((p) => p.phone === base.phone)).toEqual({
        phone: base.phone,
        name: "Priya Sharma",
        latestBookingId: third.id,
        bookings: 3,
        visits: 2,
        firstVisit: "2026-09-01",
        lastDate: "2026-10-30",
        source: "google_ads",
        campaign: "pregnancy-care-vizag",
        isDemo: false,
      });
      expect(patients.find((p) => p.phone === "9123456789")?.firstVisit).toBeNull();
    });

    it("counts sources for bookings created since a time", async () => {
      await store.create(base);
      await store.create({ ...base, source: "meta_ads" });
      await store.create({ ...base, source: "meta_ads" });
      expect(await store.sourceCounts({ clinicSlug: "lotus-clinic", since: "2000-01-01T00:00:00.000Z" })).toEqual({ website: 1, meta_ads: 2 });
      expect(await store.sourceCounts({ clinicSlug: "lotus-clinic", since: "2999-01-01T00:00:00.000Z" })).toEqual({});
    });

    it("reschedules: new day and slot, confirmed, wantsNewTime cleared", async () => {
      const b = await store.create(base);
      await store.setWantsNewTime(b.id, true);
      expect(await store.reschedule(b.id, "2026-10-24", "Evening, 5 pm – 7 pm")).toMatchObject({ date: "2026-10-24", slot: "Evening, 5 pm – 7 pm", status: "confirmed", wantsNewTime: false });
      expect(await store.reschedule("00000000-0000-4000-8000-000000000000", "2026-10-24", "x")).toBeNull();
    });

    it("keeps front-desk notes per clinic and phone", async () => {
      expect(await store.getNotes({ clinicSlug: "lotus-clinic", phone: base.phone })).toBeNull();
      await store.setNotes({ clinicSlug: "lotus-clinic", phone: base.phone, notes: "First" });
      const saved = await store.setNotes({ clinicSlug: "lotus-clinic", phone: base.phone, notes: "Second" });
      expect(saved.notes).toBe("Second");
      expect((await store.getNotes({ clinicSlug: "lotus-clinic", phone: base.phone }))?.notes).toBe("Second");
      expect(await store.getNotes({ clinicSlug: "other-clinic", phone: base.phone })).toBeNull();
    });

    it("replaceDemoData deletes only is_demo rows (and demo-phone notes) and inserts fresh demo rows", async () => {
      const real = await store.create(base);
      await store.updateStatus(real.id, "visited");
      await store.logMessage({ bookingId: real.id, kind: "confirmation", toMasked: "••••3210", template: "t", status: "sent" });
      await store.setNotes({ clinicSlug: "lotus-clinic", phone: base.phone, notes: "Real note" });
      const data = generateDemoData("2026-10-20");
      const first = await store.replaceDemoData("lotus-clinic", data);
      expect(first).toEqual({ deleted: 0, inserted: 45 });
      const demo = (await store.list({})).filter((b) => b.isDemo);
      expect(demo).toHaveLength(45);
      // A staff change to a demo row, then a reset: the change is gone, the real booking stays as it was.
      await store.updateStatus(demo[0].id, "cancelled");
      expect(await store.replaceDemoData("lotus-clinic", data)).toEqual({ deleted: 45, inserted: 45 });
      expect((await store.get(demo[0].id))?.status).toBe(demo[0].status);
      expect(await store.get(real.id)).toMatchObject({ status: "visited", isDemo: false });
      expect(await store.listMessagesForBookings([real.id])).toHaveLength(1);
      expect((await store.getNotes({ clinicSlug: "lotus-clinic", phone: base.phone }))?.notes).toBe("Real note");
      expect(await store.getNotes({ clinicSlug: "lotus-clinic", phone: data.notes[0].phone })).toMatchObject({ notes: data.notes[0].notes });
      expect((await store.list({})).length).toBe(46);
      // Demo messages came with the demo rows, and went with them.
      expect((await store.listMessagesForBookings(demo.map((b) => b.id))).length).toBe(data.messages.length);
      // Another clinic's demo rows are not touched.
      expect((await store.replaceDemoData("other-clinic", { bookings: [], messages: [], notes: [] })).deleted).toBe(0);
    });

    it("hands out copies, so callers cannot change stored rows", async () => {
      const b = await store.create(base);
      b.status = "cancelled";
      expect((await store.list({ from: base.date }))[0].status).toBe("new");
    });
  });
}

storeContract("memory", memoryStore, resetMemoryStore);

describe("memory store demo seed", () => {
  it("getStore() seeds the demo data once on first use when there is no database", async () => {
    resetMemoryStore({ seed: true });
    const prev = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      const store = getStore();
      expect(store.kind).toBe("memory");
      const all = await store.list({});
      expect(all).toHaveLength(45);
      expect(all.every((b) => b.isDemo)).toBe(true);
      getStore();
      expect(await store.list({})).toHaveLength(45);
    } finally {
      if (prev !== undefined) process.env.DATABASE_URL = prev;
      resetMemoryStore();
    }
  });

  it("resetMemoryStore() leaves it empty by default, so tests start clean", async () => {
    resetMemoryStore();
    const prev = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      expect(await getStore().list({})).toEqual([]);
    } finally {
      if (prev !== undefined) process.env.DATABASE_URL = prev;
    }
  });
});
