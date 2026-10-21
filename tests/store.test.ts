import { beforeEach, describe, expect, it } from "vitest";
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

    it("hands out copies, so callers cannot change stored rows", async () => {
      const b = await store.create(base);
      b.status = "cancelled";
      expect((await store.list({ from: base.date }))[0].status).toBe("new");
    });
  });
}

storeContract("memory", memoryStore, resetMemoryStore);
