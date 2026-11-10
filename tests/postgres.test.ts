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
    expect(params.slice(0, 12)).toEqual(["lotus-clinic", "Priya Sharma", "9876543210", "clinic", "2026-10-22", "Morning, 10 am – 1 pm", "Pregnancy care", null, "new", "website", null, null]);
    // A fresh 24-character view token, and no consent.
    expect(params[12]).toMatch(/^[A-Za-z0-9_-]{24}$/);
    expect(params.slice(13)).toEqual([null, null, null]);
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
      viewToken: null,
      awaitingPatient: false,
      noWhatsApp: false,
      phoneConfirmedAt: null,
      requestedDate: null,
      requestedSlot: null,
      consentAt: null,
      consentText: null,
      consentSource: null,
    });
  });

  it("stores consent on create and maps the new columns back", async () => {
    query.mockResolvedValue([
      {
        ...row,
        view_token: "Xk3v9QmT0bLr2aWc8YpE5nHd",
        awaiting_patient: true,
        no_whatsapp: true,
        phone_confirmed_at: new Date("2026-10-21T06:00:00Z"),
        requested_date: "2026-10-24",
        requested_slot: "Evening, 5 pm – 7 pm",
        consent_at: new Date("2026-10-21T04:30:00Z"),
        consent_text: "line",
        consent_source: "website",
      },
    ]);
    const b = await postgresStore("postgres://x").create({
      clinicSlug: "lotus-clinic",
      name: "Priya Sharma",
      phone: "9876543210",
      visitType: "clinic",
      date: "2026-10-22",
      slot: "Morning, 10 am – 1 pm",
      reason: "Pregnancy care",
      consent: { at: "2026-10-21T04:30:00.000Z", text: "line", source: "website" },
    });
    const [text, params] = query.mock.calls[0];
    expect(text).toContain("view_token, consent_at, consent_text, consent_source");
    expect(params.slice(13)).toEqual(["2026-10-21T04:30:00.000Z", "line", "website"]);
    expect(b).toMatchObject({
      viewToken: "Xk3v9QmT0bLr2aWc8YpE5nHd",
      awaitingPatient: true,
      noWhatsApp: true,
      phoneConfirmedAt: "2026-10-21T06:00:00.000Z",
      requestedDate: "2026-10-24",
      requestedSlot: "Evening, 5 pm – 7 pm",
      consentAt: "2026-10-21T04:30:00.000Z",
      consentText: "line",
      consentSource: "website",
    });
  });

  it("finds a booking by view token, and the patient-page and staff updates send the right SQL", async () => {
    query.mockResolvedValue([row]);
    const store = postgresStore("postgres://x");
    await store.getByViewToken("Xk3v9QmT0bLr2aWc8YpE5nHd");
    expect(query.mock.calls[0][0]).toMatch(/WHERE view_token = \$1$/);
    expect(query.mock.calls[0][1]).toEqual(["Xk3v9QmT0bLr2aWc8YpE5nHd"]);
    await store.requestNewTime(row.id, "2026-10-24", "Evening, 5 pm – 7 pm");
    expect(query.mock.calls[1][0]).toContain("SET wants_new_time = true, requested_date = $2::date, requested_slot = $3, awaiting_patient = false");
    await store.setAwaitingPatient(row.id, false);
    expect(query.mock.calls[2][0]).toContain("SET awaiting_patient = $2");
    await store.setNoWhatsApp(row.id, true);
    expect(query.mock.calls[3][0]).toContain("SET no_whatsapp = $2");
    await store.confirmByPhone(row.id);
    expect(query.mock.calls[4][0]).toContain("status = 'confirmed'");
    expect(query.mock.calls[4][0]).toContain("phone_confirmed_at = now()");
  });

  it("opt-outs and unreachable phones: insert once, delete, and look up in one query", async () => {
    const store = postgresStore("postgres://x");
    query.mockResolvedValueOnce([{ phone: "9876543210" }]).mockResolvedValueOnce([]);
    expect(await store.optOut("9876543210", "whatsapp")).toBe(true);
    expect(await store.optOut("9876543210", "whatsapp")).toBe(false);
    expect(query.mock.calls[0][0]).toContain("ON CONFLICT (phone) DO NOTHING RETURNING phone");
    query.mockResolvedValueOnce([{ phone: "9876543210" }]);
    expect(await store.optIn("9876543210")).toBe(true);
    expect(query.mock.calls[2][0]).toBe("DELETE FROM whatsapp_optouts WHERE phone = $1 RETURNING phone");
    query.mockResolvedValueOnce([]);
    await store.markUnreachable("9876543210", "63024");
    expect(query.mock.calls[3]).toEqual(["INSERT INTO whatsapp_unreachable (phone, reason) VALUES ($1, $2) ON CONFLICT (phone) DO NOTHING", ["9876543210", "63024"]]);
    query.mockResolvedValueOnce([
      { phone: "9876543210", kind: "optout" },
      { phone: "9123456789", kind: "unreachable" },
    ]);
    expect(await store.whatsappBlocks(["9876543210", "9123456789", "9876543210"])).toEqual({ optedOut: ["9876543210"], unreachable: ["9123456789"] });
    expect(query.mock.calls[4][1]).toEqual([["9876543210", "9123456789"]]);
    expect(await store.whatsappBlocks([])).toEqual({ optedOut: [], unreachable: [] });
    expect(query).toHaveBeenCalledTimes(5);
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
    expect(text).toMatch(/WHERE phone = \$1 AND status IN \('new', 'confirmed'\) AND date >= \$2::date ORDER BY awaiting_patient DESC, created_at DESC LIMIT 1$/);
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
    expect(params.slice(8, 12)).toEqual(["confirmed", "walk_in", "spring", JSON.stringify({ utm_source: "google" })]);
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

  it("needsAction: status new, wants a new time, or No WhatsApp still to call from today, for one clinic", async () => {
    query.mockResolvedValue([row]);
    await postgresStore("postgres://x").needsAction({ clinicSlug: "lotus-clinic", today: "2026-10-21" });
    const [text, params] = query.mock.calls[0];
    expect(text).toContain(
      "WHERE clinic_slug = $1 AND (status = 'new' OR wants_new_time OR (no_whatsapp AND status IN ('new', 'confirmed') AND date >= $2::date AND phone_confirmed_at IS NULL))",
    );
    expect(params).toEqual(["lotus-clinic", "2026-10-21"]);
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

  it("reschedules: new day and slot, confirmed, flag and request cleared, waiting for the patient when asked", async () => {
    query.mockResolvedValue([{ ...row, date: "2026-10-24", status: "confirmed", awaiting_patient: true }]);
    const b = await postgresStore("postgres://x").reschedule(row.id, "2026-10-24", "Evening, 5 pm – 7 pm", { awaitingPatient: true });
    const [text, params] = query.mock.calls[0];
    expect(text).toContain("SET date = $2::date, slot = $3, status = 'confirmed', wants_new_time = false, requested_date = NULL, requested_slot = NULL");
    expect(text).toContain("awaiting_patient = $4");
    expect(params).toEqual([row.id, "2026-10-24", "Evening, 5 pm – 7 pm", true]);
    expect(b?.awaitingPatient).toBe(true);
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
          viewToken: "Xk3v9QmT0bLr2aWc8YpE5nHd",
          awaitingPatient: true,
          noWhatsApp: false,
          phoneConfirmedAt: null,
          requestedDate: null,
          requestedSlot: null,
          consentAt: "2026-10-20T04:00:00.000Z",
          consentText: "line",
          consentSource: "website",
        },
      ],
      messages: [],
      notes: [{ phone: "9000020101", notes: "n", updatedAt: "2026-10-20T04:00:00.000Z" }],
      optOuts: [
        { phone: "9000020102", optedOutAt: "2026-10-20T04:00:00.000Z" },
        // A real number in the demo data is dropped, never written.
        { phone: "9876543210", optedOutAt: "2026-10-20T04:00:00.000Z" },
      ],
    });
    expect(result).toEqual({ deleted: 2, inserted: 1 });
    expect(transaction).toHaveBeenCalledTimes(1);
    const queries = transaction.mock.calls[0][0] as { text: string; params: unknown[] }[];
    expect(queries.map((q) => q.text.split(/\s+/).slice(0, 3).join(" "))).toEqual([
      "DELETE FROM bookings",
      "DELETE FROM patient_notes",
      "INSERT INTO bookings",
      "INSERT INTO messages",
      "INSERT INTO patient_notes",
      "DELETE FROM whatsapp_optouts",
      "DELETE FROM whatsapp_unreachable",
      "INSERT INTO whatsapp_optouts",
    ]);
    expect(queries[5].params).toEqual(["900002%"]);
    expect(queries[6].params).toEqual(["900002%"]);
    expect(JSON.parse(queries[7].params[0] as string)).toEqual([{ phone: "9000020102", opted_out_at: "2026-10-20T04:00:00.000Z" }]);
    expect(queries[0].text).toBe("DELETE FROM bookings WHERE clinic_slug = $1 AND is_demo = true RETURNING id");
    expect(queries[1].params).toEqual(["lotus-clinic", "900002%"]);
    expect(queries[2].text).toContain("x.utm, true");
    expect(JSON.parse(queries[2].params[1] as string)[0]).toMatchObject({
      id: row.id,
      phone: "9000020101",
      status: "visited",
      source: "google_ads",
      view_token: "Xk3v9QmT0bLr2aWc8YpE5nHd",
      awaiting_patient: true,
      consent_source: "website",
    });
  });
});
