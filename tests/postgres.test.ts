import { beforeEach, describe, expect, it, vi } from "vitest";

// No real database here. The Neon driver is replaced, so these tests check the SQL we send
// and how rows map back. They do not prove the SQL runs on Postgres.
const query = vi.fn();
vi.mock("@neondatabase/serverless", () => ({ neon: () => ({ query }) }));

const { postgresStore } = await import("@/lib/bookings/postgres");

const row = {
  id: "0f8e2c1a-1111-4222-8333-444455556666",
  created_at: new Date("2026-10-21T04:30:00Z"),
  clinic_slug: "lotus-clinic",
  name: "Priya Sharma",
  phone: "9876543210",
  visit_type: "clinic",
  date: "2026-10-22",
  slot: "Morning, 10 am – 1 pm",
  reason: "Pregnancy care",
  status: "new",
  notes: null,
};

describe("postgres store (driver mocked)", () => {
  beforeEach(() => query.mockReset());

  it("inserts with $n parameters and maps the returned row", async () => {
    query.mockResolvedValue([row]);
    const store = postgresStore("postgres://x");
    const b = await store.create({
      clinicSlug: "lotus-clinic",
      name: "Priya Sharma",
      phone: "9876543210",
      visitType: "clinic",
      date: "2026-10-22",
      slot: "Morning, 10 am – 1 pm",
      reason: "Pregnancy care",
    });
    const [text, params] = query.mock.calls[0];
    expect(text).toMatch(/^INSERT INTO bookings/);
    expect(text).toContain("date::text AS date");
    expect(params).toEqual(["lotus-clinic", "Priya Sharma", "9876543210", "clinic", "2026-10-22", "Morning, 10 am – 1 pm", "Pregnancy care", null]);
    expect(b).toEqual({
      id: row.id,
      createdAt: "2026-10-21T04:30:00.000Z",
      clinicSlug: "lotus-clinic",
      name: "Priya Sharma",
      phone: "9876543210",
      visitType: "clinic",
      date: "2026-10-22",
      slot: "Morning, 10 am – 1 pm",
      reason: "Pregnancy care",
      status: "new",
      notes: null,
    });
  });

  it("lists from a day for one clinic", async () => {
    query.mockResolvedValue([row]);
    const list = await postgresStore("postgres://x").list({ from: "2026-10-21", clinicSlug: "lotus-clinic" });
    const [text, params] = query.mock.calls[0];
    expect(text).toMatch(/WHERE date >= \$1::date AND clinic_slug = \$2 ORDER BY date, created_at/);
    expect(params).toEqual(["2026-10-21", "lotus-clinic"]);
    expect(list).toHaveLength(1);
  });

  it("updates the status, and returns null when no row matches", async () => {
    query.mockResolvedValueOnce([{ ...row, status: "confirmed" }]).mockResolvedValueOnce([]);
    const store = postgresStore("postgres://x");
    expect((await store.updateStatus(row.id, "confirmed"))?.status).toBe("confirmed");
    expect(query.mock.calls[0][1]).toEqual([row.id, "confirmed"]);
    expect(await store.updateStatus(row.id, "cancelled")).toBeNull();
  });

  const msgRow = {
    id: "9a9a9a9a-1111-4222-8333-444455556666",
    booking_id: row.id,
    kind: "confirmation",
    channel: "whatsapp",
    to_masked: "••••3210",
    template: "hello_world",
    provider_message_id: "wamid.ABC",
    status: "sent",
    error: null,
    created_at: new Date("2026-10-21T15:21:00Z"),
    updated_at: "2026-10-21T15:21:00.000Z",
  };

  it("logs a message with $n parameters and maps the row", async () => {
    query.mockResolvedValue([msgRow]);
    const m = await postgresStore("postgres://x").logMessage({
      bookingId: row.id,
      kind: "confirmation",
      toMasked: "••••3210",
      template: "hello_world",
      status: "sent",
      providerMessageId: "wamid.ABC",
    });
    const [text, params] = query.mock.calls[0];
    expect(text).toMatch(/^INSERT INTO messages/);
    expect(params).toEqual([row.id, "confirmation", "••••3210", "hello_world", "wamid.ABC", "sent", null]);
    expect(m).toEqual({
      id: msgRow.id,
      bookingId: row.id,
      kind: "confirmation",
      channel: "whatsapp",
      toMasked: "••••3210",
      template: "hello_world",
      providerMessageId: "wamid.ABC",
      status: "sent",
      error: null,
      createdAt: "2026-10-21T15:21:00.000Z",
      updatedAt: "2026-10-21T15:21:00.000Z",
    });
  });

  it("updates a status forward only, by provider id", async () => {
    query.mockResolvedValueOnce([{ ...msgRow, status: "delivered" }]).mockResolvedValueOnce([]);
    const store = postgresStore("postgres://x");
    expect((await store.updateMessageStatus("wamid.ABC", "delivered"))?.status).toBe("delivered");
    const [text, params] = query.mock.calls[0];
    expect(text.replace(/\s+/g, " ")).toMatch(/WHERE provider_message_id = \$1 AND CASE status .* END < CASE \$2::text .* END/);
    expect(text).toContain("WHEN 'read' THEN 3");
    expect(params).toEqual(["wamid.ABC", "delivered", null]);
    expect(await store.updateMessageStatus("wamid.ABC", "sent")).toBeNull();
  });

  it("lists messages for many bookings in one query, and skips the query for none", async () => {
    query.mockResolvedValue([msgRow]);
    const store = postgresStore("postgres://x");
    expect(await store.listMessagesForBookings([])).toEqual([]);
    expect(query).not.toHaveBeenCalled();
    const list = await store.listMessagesForBookings([row.id]);
    const [text, params] = query.mock.calls[0];
    expect(text).toMatch(/WHERE booking_id = ANY\(\$1::uuid\[\]\) ORDER BY created_at DESC/);
    expect(params).toEqual([[row.id]]);
    expect(list[0].providerMessageId).toBe("wamid.ABC");
  });
});
