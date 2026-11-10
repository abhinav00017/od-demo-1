import { beforeEach, describe, expect, it, vi } from "vitest";

// No real database here. The Neon driver is replaced, so these tests check the SQL we send
// and how rows map back. They do not prove the SQL runs on Postgres.
const query = vi.fn();
// transaction() gets the queries' results back, one array per query.
const transaction = vi.fn();
vi.mock("@neondatabase/serverless", () => ({ neon: () => ({ query, transaction }) }));

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
  beforeEach(() => {
    query.mockReset();
    transaction.mockReset();
  });

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
    expect(params).toEqual(["lotus-clinic", "Priya Sharma", "9876543210", "clinic", "2026-10-22", "Morning, 10 am – 1 pm", "Pregnancy care", null, "new", "website", null, null]);
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
      wantsNewTime: false,
      source: "website",
      campaign: null,
      utm: null,
      isDemo: false,
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

  it("clears wants_new_time unless the status goes back to new", async () => {
    query.mockResolvedValueOnce([{ ...row, status: "confirmed", wants_new_time: false }]);
    await postgresStore("postgres://x").updateStatus(row.id, "confirmed");
    expect(query.mock.calls[0][0]).toContain("wants_new_time = CASE WHEN $2 = 'new' THEN wants_new_time ELSE false END");
  });

  it("sets wants_new_time and maps it back", async () => {
    query.mockResolvedValueOnce([{ ...row, wants_new_time: true }]).mockResolvedValueOnce([]);
    const store = postgresStore("postgres://x");
    expect((await store.setWantsNewTime(row.id, true))?.wantsNewTime).toBe(true);
    const [text, params] = query.mock.calls[0];
    expect(text).toMatch(/^UPDATE bookings SET wants_new_time = \$2 WHERE id = \$1::uuid RETURNING .*wants_new_time/);
    expect(params).toEqual([row.id, true]);
    expect(await store.setWantsNewTime(row.id, false)).toBeNull();
  });

  it("findLatestByPhone: open bookings from today, newest created first", async () => {
    query.mockResolvedValueOnce([row]).mockResolvedValueOnce([]);
    const store = postgresStore("postgres://x");
    expect((await store.findLatestByPhone("9876543210", "2026-10-22"))?.id).toBe(row.id);
    const [text, params] = query.mock.calls[0];
    expect(text).toMatch(/WHERE phone = \$1 AND status IN \('new', 'confirmed'\) AND date >= \$2::date ORDER BY created_at DESC LIMIT 1$/);
    expect(params).toEqual(["9876543210", "2026-10-22"]);
    expect(await store.findLatestByPhone("9876543210", "2026-10-22")).toBeNull();
  });

  it("findLatestByPhone defaults to today in clinic time", async () => {
    query.mockResolvedValueOnce([]);
    await postgresStore("postgres://x").findLatestByPhone("9876543210");
    expect(query.mock.calls[0][1][1]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  const msgRow = {
    id: "9a9a9a9a-1111-4222-8333-444455556666",
    booking_id: row.id,
    kind: "confirmation",
    channel: "whatsapp",
    provider: "meta",
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
    expect(text).toContain("provider");
    expect(params).toEqual([row.id, "confirmation", "••••3210", "hello_world", "wamid.ABC", "sent", null, "meta"]);
    expect(m).toEqual({
      id: msgRow.id,
      bookingId: row.id,
      kind: "confirmation",
      channel: "whatsapp",
      provider: "meta",
      toMasked: "••••3210",
      template: "hello_world",
      providerMessageId: "wamid.ABC",
      status: "sent",
      error: null,
      createdAt: "2026-10-21T15:21:00.000Z",
      updatedAt: "2026-10-21T15:21:00.000Z",
    });
  });

  it("logs a Twilio message with its provider, and reads the provider back", async () => {
    query.mockResolvedValue([{ ...msgRow, provider: "twilio", template: "text", provider_message_id: "SM123" }]);
    const m = await postgresStore("postgres://x").logMessage({
      bookingId: row.id,
      kind: "confirmation",
      provider: "twilio",
      toMasked: "••••3210",
      template: "text",
      status: "sent",
      providerMessageId: "SM123",
    });
    const [text, params] = query.mock.calls[0];
    expect(text.replace(/\s+/g, " ")).toMatch(/INSERT INTO messages \(.*provider\) VALUES \(.*\$8\)/);
    expect(text).toMatch(/RETURNING .*provider, to_masked/);
    expect(params[7]).toBe("twilio");
    expect(m).toMatchObject({ provider: "twilio", template: "text", providerMessageId: "SM123" });
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

  it("creates a staff booking with its status, source, campaign and utm", async () => {
    query.mockResolvedValue([{ ...row, status: "confirmed", source: "walk_in", campaign: null, utm: { utm_source: "google" }, is_demo: false }]);
    const b = await postgresStore("postgres://x").create({
      clinicSlug: "lotus-clinic",
      name: "Priya Sharma",
      phone: "9876543210",
      visitType: "clinic",
      date: "2026-10-22",
      slot: "Morning, 10 am – 1 pm",
      reason: "Pregnancy care",
      status: "confirmed",
      source: "walk_in",
      campaign: "spring",
      utm: { utm_source: "google" },
    });
    const [text, params] = query.mock.calls[0];
    expect(text).toContain("$12::jsonb");
    expect(params.slice(8)).toEqual(["confirmed", "walk_in", "spring", JSON.stringify({ utm_source: "google" })]);
    expect(b).toMatchObject({ status: "confirmed", source: "walk_in", utm: { utm_source: "google" }, isDemo: false });
  });

  it("lists by date range and status, with every filter a parameter", async () => {
    query.mockResolvedValue([]);
    await postgresStore("postgres://x").list({ from: "2026-10-01", to: "2026-10-30", clinicSlug: "lotus-clinic", statuses: ["visited", "no_show"] });
    const [text, params] = query.mock.calls[0];
    expect(text).toContain("WHERE date >= $1::date AND date <= $2::date AND clinic_slug = $3 AND status = ANY($4::text[])");
    expect(params).toEqual(["2026-10-01", "2026-10-30", "lotus-clinic", ["visited", "no_show"]]);
  });

  it("gets one booking by id", async () => {
    query.mockResolvedValueOnce([row]).mockResolvedValueOnce([]);
    const store = postgresStore("postgres://x");
    expect((await store.get(row.id))?.id).toBe(row.id);
    expect(query.mock.calls[0][0]).toMatch(/WHERE id = \$1::uuid$/);
    expect(await store.get(row.id)).toBeNull();
  });

  it("needsAction: status new or wants a new time, for one clinic", async () => {
    query.mockResolvedValue([row]);
    await postgresStore("postgres://x").needsAction({ clinicSlug: "lotus-clinic" });
    const [text, params] = query.mock.calls[0];
    expect(text).toContain("WHERE clinic_slug = $1 AND (status = 'new' OR wants_new_time)");
    expect(params).toEqual(["lotus-clinic"]);
  });

  it("searches name with ILIKE (wildcards escaped) and phone by its digits", async () => {
    query.mockResolvedValue([]);
    const store = postgresStore("postgres://x");
    await store.search({ clinicSlug: "lotus-clinic", q: " 50%_off " });
    expect(query.mock.calls[0][1]).toEqual(["lotus-clinic", "%50\\%\\_off%", "50", 100]);
    await store.search({ clinicSlug: "lotus-clinic", q: "3210", limit: 5 });
    const [text, params] = query.mock.calls[1];
    expect(text).toContain("name ILIKE $2 OR ($3 <> '' AND phone LIKE '%' || $3 || '%')");
    expect(params).toEqual(["lotus-clinic", "%3210%", "3210", 5]);
    expect(await store.search({ clinicSlug: "lotus-clinic", q: "  " })).toEqual([]);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("patient history by phone, newest day first", async () => {
    query.mockResolvedValue([row]);
    await postgresStore("postgres://x").historyByPhone({ clinicSlug: "lotus-clinic", phone: "9876543210" });
    const [text, params] = query.mock.calls[0];
    expect(text).toContain("WHERE clinic_slug = $1 AND phone = $2 ORDER BY date DESC, created_at DESC");
    expect(params).toEqual(["lotus-clinic", "9876543210"]);
  });

  it("patients: grouped by phone and mapped", async () => {
    query.mockResolvedValue([
      { phone: "9876543210", name: "Priya", latest_id: row.id, bookings: 3, visits: 2, first_visit: "2026-09-01", last_date: "2026-10-22", source: "google_ads", campaign: "pcos-awareness", is_demo: false },
    ]);
    const list = await postgresStore("postgres://x").patients({ clinicSlug: "lotus-clinic" });
    const [text, params] = query.mock.calls[0];
    expect(text).toContain("GROUP BY phone");
    expect(text).toContain("FILTER (WHERE status = 'visited')");
    expect(params).toEqual(["lotus-clinic"]);
    expect(list).toEqual([
      { phone: "9876543210", name: "Priya", latestBookingId: row.id, bookings: 3, visits: 2, firstVisit: "2026-09-01", lastDate: "2026-10-22", source: "google_ads", campaign: "pcos-awareness", isDemo: false },
    ]);
  });

  it("source counts since a time", async () => {
    query.mockResolvedValue([
      { source: "website", count: 4 },
      { source: "meta_ads", count: "2" },
    ]);
    const counts = await postgresStore("postgres://x").sourceCounts({ clinicSlug: "lotus-clinic", since: "2026-10-01T00:00:00.000Z" });
    expect(query.mock.calls[0][0]).toContain("created_at >= $2::timestamptz GROUP BY source");
    expect(counts).toEqual({ website: 4, meta_ads: 2 });
  });

  it("reschedules: new day and slot, confirmed, flag cleared", async () => {
    query.mockResolvedValue([{ ...row, date: "2026-10-24", status: "confirmed" }]);
    const b = await postgresStore("postgres://x").reschedule(row.id, "2026-10-24", "Evening, 5 pm – 7 pm");
    const [text, params] = query.mock.calls[0];
    expect(text).toContain("SET date = $2::date, slot = $3, status = 'confirmed', wants_new_time = false");
    expect(params).toEqual([row.id, "2026-10-24", "Evening, 5 pm – 7 pm"]);
    expect(b?.date).toBe("2026-10-24");
  });

  it("gets and upserts patient notes by clinic and phone", async () => {
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ notes: "Allergic to penicillin.", updated_at: new Date("2026-10-21T10:00:00Z") }]);
    const store = postgresStore("postgres://x");
    expect(await store.getNotes({ clinicSlug: "lotus-clinic", phone: "9876543210" })).toBeNull();
    const saved = await store.setNotes({ clinicSlug: "lotus-clinic", phone: "9876543210", notes: "Allergic to penicillin." });
    const [text, params] = query.mock.calls[1];
    expect(text).toContain("ON CONFLICT (clinic_slug, phone) DO UPDATE SET notes = EXCLUDED.notes");
    expect(params).toEqual(["lotus-clinic", "9876543210", "Allergic to penicillin."]);
    expect(saved).toEqual({ notes: "Allergic to penicillin.", updatedAt: "2026-10-21T10:00:00.000Z" });
  });

  it("replaces demo data in one transaction that only deletes is_demo rows and demo-phone notes", async () => {
    query.mockImplementation((text: string, params: unknown[]) => ({ text, params }));
    transaction.mockResolvedValue([[{ id: "a" }, { id: "b" }], [], [{ id: "c" }], [], []]);
    const result = await postgresStore("postgres://x").replaceDemoData("lotus-clinic", {
      bookings: [
        {
          id: row.id,
          createdAt: "2026-10-20T04:00:00.000Z",
          clinicSlug: "lotus-clinic",
          name: "Demo",
          phone: "9000020101",
          visitType: "clinic",
          date: "2026-10-22",
          slot: "Morning, 10 am – 1 pm",
          reason: "PCOS",
          status: "visited",
          notes: null,
          wantsNewTime: false,
          source: "google_ads",
          campaign: "pcos-awareness",
          utm: { gclid: "x" },
        },
      ],
      messages: [],
      notes: [{ phone: "9000020101", notes: "n", updatedAt: "2026-10-20T04:00:00.000Z" }],
    });
    expect(result).toEqual({ deleted: 2, inserted: 1 });
    expect(transaction).toHaveBeenCalledTimes(1);
    const queries = transaction.mock.calls[0][0] as { text: string; params: unknown[] }[];
    expect(queries.map((q) => q.text.split(/\s+/).slice(0, 3).join(" "))).toEqual(["DELETE FROM bookings", "DELETE FROM patient_notes", "INSERT INTO bookings", "INSERT INTO messages", "INSERT INTO patient_notes"]);
    expect(queries[0].text).toBe("DELETE FROM bookings WHERE clinic_slug = $1 AND is_demo = true RETURNING id");
    expect(queries[1].params).toEqual(["lotus-clinic", "900002%"]);
    expect(queries[2].text).toContain("x.utm, true");
    expect(JSON.parse(queries[2].params[1] as string)[0]).toMatchObject({ id: row.id, phone: "9000020101", status: "visited", source: "google_ads" });
  });
});
