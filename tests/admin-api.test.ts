// @vitest-environment node
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listRange, POST as createStaff } from "@/app/api/admin/bookings/route";
import { POST as resetDemo } from "@/app/api/admin/demo/reset/route";
import { GET as patientHistory, PUT as saveNotes } from "@/app/api/admin/patients/[bookingId]/route";
import { GET as patientList } from "@/app/api/admin/patients/route";
import { POST as search } from "@/app/api/admin/search/route";
import { GET as session } from "@/app/api/admin/session/route";
import { PATCH } from "@/app/api/bookings/[id]/route";
import { GET, POST } from "@/app/api/bookings/route";
import { ADMIN_COOKIE, signSession } from "@/lib/admin/auth";
import { memoryStore, resetMemoryStore } from "@/lib/bookings/memory";
import type { NewBooking } from "@/lib/bookings/types";
import { resetRateLimits } from "@/lib/rateLimit";

// Tuesday 20 Oct 2026, 10:00 in India.
const NOW = new Date("2026-10-20T04:30:00Z");
const TODAY = "2026-10-20";

const base: NewBooking = {
  clinicSlug: "lotus-clinic",
  name: "Priya Sharma",
  phone: "9876543210",
  visitType: "clinic",
  date: TODAY,
  slot: "Morning, 10 am – 1 pm",
  reason: "Pregnancy care",
  consent: { at: "2026-10-19T04:30:00.000Z", text: "By booking, you agree that Lotus Women's Clinic may message you on WhatsApp about this visit.", source: "website" },
};

const staff = {
  name: "Walk In Wanda",
  phone: "98765 11111",
  date: "2026-10-21",
  slot: "Evening, 5 pm – 7 pm",
  visitType: "clinic",
  reason: "PCOS",
  source: "walk_in",
};

function req(url: string, init: { method?: string; body?: unknown; cookie?: string } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json", "x-forwarded-for": "203.0.113.8" };
  if (init.cookie) headers.cookie = init.cookie;
  return new NextRequest(`http://localhost${url}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : typeof init.body === "string" ? init.body : JSON.stringify(init.body),
  });
}

const cookie = () => `${ADMIN_COOKIE}=${signSession("test-secret")}`;
const idCtx = (id: string) => ({ params: Promise.resolve({ id }) });
const patientCtx = (bookingId: string) => ({ params: Promise.resolve({ bookingId }) });
const logs: string[] = [];
const fetchSpy = vi.fn();

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});
afterAll(() => vi.useRealTimers());

beforeEach(() => {
  resetMemoryStore();
  resetRateLimits();
  logs.length = 0;
  fetchSpy.mockReset();
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("ADMIN_PASSWORD", "open-sesame");
  vi.stubEnv("ADMIN_SECRET", "test-secret");
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("CLINIC_WHATSAPP", "");
  vi.stubEnv("WHATSAPP_TOKEN", "");
  vi.stubEnv("WHATSAPP_FAKE", "1");
  vi.stubEnv("DEMO_RESET_DISABLED", "");
  for (const level of ["log", "error", "warn", "info"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => void logs.push(args.map(String).join(" ")));
  }
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("auth gate", () => {
  it("every new admin route answers 401 without the cookie, and with a forged one", async () => {
    const real = await memoryStore.create(base);
    for (const c of [undefined, `${ADMIN_COOKIE}=forged.123.abc`]) {
      const responses = await Promise.all([
        listRange(req(`/api/admin/bookings?from=2026-10-01&to=2026-10-19`, { cookie: c })),
        createStaff(req("/api/admin/bookings", { method: "POST", body: staff, cookie: c })),
        search(req("/api/admin/search", { method: "POST", body: { q: "Priya" }, cookie: c })),
        patientList(req("/api/admin/patients", { cookie: c })),
        patientHistory(req(`/api/admin/patients/${real.id}`, { cookie: c }), patientCtx(real.id)),
        saveNotes(req(`/api/admin/patients/${real.id}`, { method: "PUT", body: { notes: "x" }, cookie: c }), patientCtx(real.id)),
        resetDemo(req("/api/admin/demo/reset", { method: "POST", cookie: c })),
      ]);
      expect(responses.map((r) => r.status)).toEqual([401, 401, 401, 401, 401, 401, 401]);
    }
    expect(await memoryStore.list({})).toHaveLength(1);
    expect(await memoryStore.getNotes({ clinicSlug: "lotus-clinic", phone: base.phone })).toBeNull();
  });

  it("the session says whether Reset demo data is on", async () => {
    expect((await (await session(req("/api/admin/session", { cookie: cookie() }))).json()).demoReset).toBe(true);
    vi.stubEnv("DEMO_RESET_DISABLED", "1");
    expect((await (await session(req("/api/admin/session", { cookie: cookie() }))).json()).demoReset).toBe(false);
    expect((await (await session(req("/api/admin/session"))).json()).demoReset).toBeUndefined();
  });
});

describe("status changes", () => {
  it("allows visited and no_show on today and earlier, not on a future day, and sends nothing for them", async () => {
    const today = await memoryStore.create(base);
    const past = await memoryStore.create({ ...base, date: "2026-10-10" });
    const later = await memoryStore.create({ ...base, date: "2026-10-22" });
    const visited = await PATCH(req(`/api/bookings/${today.id}`, { method: "PATCH", body: { status: "visited" }, cookie: cookie() }), idCtx(today.id));
    expect(visited.status).toBe(200);
    expect((await visited.json()).booking.status).toBe("visited");
    expect((await PATCH(req(`/api/bookings/${past.id}`, { method: "PATCH", body: { status: "no_show" }, cookie: cookie() }), idCtx(past.id))).status).toBe(200);
    const refused = await PATCH(req(`/api/bookings/${later.id}`, { method: "PATCH", body: { status: "visited" }, cookie: cookie() }), idCtx(later.id));
    expect(refused.status).toBe(400);
    expect((await refused.json()).error).toMatch(/today or earlier/);
    expect((await memoryStore.get(later.id))?.status).toBe("new");
    await new Promise((r) => setTimeout(r, 20));
    expect(await memoryStore.listMessagesForBookings([today.id, past.id])).toEqual([]);
  });

  it("changes the day or slot of a booking that wants a new time: moves, stays confirmed, clears the flag, sends visit moved and waits for the patient", async () => {
    const b = await memoryStore.create({ ...base, date: "2026-10-22" });
    await memoryStore.updateStatus(b.id, "confirmed");
    await memoryStore.setWantsNewTime(b.id, true);
    await memoryStore.logMessage({ bookingId: b.id, kind: "confirmation", provider: "fake", toMasked: "••••3210", template: "t", status: "sent" });
    const res = await PATCH(req(`/api/bookings/${b.id}`, { method: "PATCH", body: { date: "2026-10-23", slot: "Evening, 5 pm – 7 pm" }, cookie: cookie() }), idCtx(b.id));
    expect(res.status).toBe(200);
    expect((await res.json()).booking).toMatchObject({ date: "2026-10-23", slot: "Evening, 5 pm – 7 pm", status: "confirmed", wantsNewTime: false, awaitingPatient: true });
    await vi.waitFor(async () => expect((await memoryStore.listMessagesForBookings([b.id])).filter((m) => m.kind === "visit_moved")).toHaveLength(1));
    // No second confirmation: the patient is asked to confirm the new time instead.
    expect((await memoryStore.listMessagesForBookings([b.id])).filter((m) => m.kind === "confirmation")).toHaveLength(1);
  });

  it("refuses a reschedule to the past, a Sunday clinic visit or an unknown slot", async () => {
    const b = await memoryStore.create({ ...base, date: "2026-10-22" });
    const bad = [
      { date: "2026-10-19", slot: base.slot },
      { date: "2026-10-25", slot: base.slot },
      { date: "2026-10-23", slot: "Midnight" },
      { date: "not-a-day", slot: base.slot },
    ];
    for (const body of bad) {
      expect((await PATCH(req(`/api/bookings/${b.id}`, { method: "PATCH", body, cookie: cookie() }), idCtx(b.id))).status).toBe(400);
    }
    expect((await memoryStore.get(b.id))?.date).toBe("2026-10-22");
  });
});

describe("staff bookings", () => {
  it("saves a confirmed booking with its source and sends nothing by default", async () => {
    const res = await createStaff(req("/api/admin/bookings", { method: "POST", body: staff, cookie: cookie() }));
    expect(res.status).toBe(201);
    const { booking, sendWhatsApp } = await res.json();
    expect(booking).toMatchObject({ name: "Walk In Wanda", phone: "9876511111", status: "confirmed", source: "walk_in", isDemo: false });
    expect(sendWhatsApp).toBe(false);
    await new Promise((r) => setTimeout(r, 20));
    expect(await memoryStore.listMessagesForBookings([booking.id])).toEqual([]);
  });

  it("sends a WhatsApp confirmation when the box is ticked", async () => {
    const res = await createStaff(req("/api/admin/bookings", { method: "POST", body: { ...staff, sendWhatsApp: true }, cookie: cookie() }));
    const { booking } = await res.json();
    await vi.waitFor(async () => expect(await memoryStore.listMessagesForBookings([booking.id])).toMatchObject([{ kind: "confirmation", provider: "fake", status: "sent" }]));
    expect(logs.join("\n")).not.toMatch(/9876511111|98765 11111/);
  });

  it("answers 400 with field errors for bad input or a source staff cannot pick", async () => {
    const res = await createStaff(req("/api/admin/bookings", { method: "POST", body: { ...staff, name: "", phone: "123", date: "2026-10-19", source: "google_search" }, cookie: cookie() }));
    expect(res.status).toBe(400);
    expect(Object.keys((await res.json()).fieldErrors).sort()).toEqual(["date", "name", "phone", "source"]);
    expect((await createStaff(req("/api/admin/bookings", { method: "POST", body: "nope", cookie: cookie() }))).status).toBe(400);
    expect(await memoryStore.list({})).toEqual([]);
  });
});

describe("public booking source", () => {
  const good = { name: "Priya Sharma", phone: "+91 98765 43210", visitType: "clinic", date: "2026-10-22", slot: "Morning, 10 am – 1 pm", reason: "Pregnancy care", consent: true };

  it("keeps a valid first-touch source, campaign and utm", async () => {
    const res = await POST(
      req("/api/bookings", { method: "POST", body: { ...good, source: "google_ads", campaign: "pcos-awareness", utm: { gclid: "abc", utm_campaign: "pcos-awareness", evil: "x" } } }),
    );
    expect(res.status).toBe(201);
    expect((await res.json()).booking).toMatchObject({ source: "google_ads", campaign: "pcos-awareness", utm: { gclid: "abc", utm_campaign: "pcos-awareness" } });
    const [saved] = await memoryStore.list({});
    expect(saved.utm).not.toHaveProperty("evil");
  });

  it("falls back to website for an unknown or staff-only source, caps long strings, and never fails the booking", async () => {
    for (const source of ["walk_in", "hacker", 42, null]) {
      const res = await POST(req("/api/bookings", { method: "POST", body: { ...good, source, campaign: "x".repeat(500), utm: "not an object" } }));
      expect(res.status).toBe(201);
      const { booking } = await res.json();
      expect(booking.source).toBe("website");
      expect(booking.campaign).toHaveLength(100);
      expect(booking.utm).toBeNull();
    }
  });
});

describe("GET /api/bookings live data", () => {
  it("adds needsAction (new on any day, or wants a new time) and source counts for the last 30 days", async () => {
    await memoryStore.create({ ...base, date: "2026-10-01", name: "Old request" });
    const moving = await memoryStore.create({ ...base, date: "2026-10-22", name: "Moving", source: "meta_ads" });
    await memoryStore.updateStatus(moving.id, "confirmed");
    await memoryStore.setWantsNewTime(moving.id, true);
    const done = await memoryStore.create({ ...base, name: "Done", source: "walk_in" });
    await memoryStore.updateStatus(done.id, "visited");
    const data = await (await GET(req("/api/bookings", { cookie: cookie() }))).json();
    expect(data.needsAction.map((b: { name: string }) => b.name)).toEqual(["Old request", "Moving"]);
    expect(data.bookings.map((b: { name: string }) => b.name).sort()).toEqual(["Done", "Moving"]);
    expect(data.sources).toEqual({ website: 1, meta_ads: 1, walk_in: 1 });
  });
});

describe("past, search and patients", () => {
  it("lists a date range with a status filter, newest day first", async () => {
    const a = await memoryStore.create({ ...base, date: "2026-10-05" });
    const b = await memoryStore.create({ ...base, date: "2026-10-12" });
    await memoryStore.create({ ...base, date: "2026-10-15" });
    await memoryStore.updateStatus(a.id, "visited");
    await memoryStore.updateStatus(b.id, "visited");
    const all = await (await listRange(req("/api/admin/bookings?from=2026-09-20&to=2026-10-19", { cookie: cookie() }))).json();
    expect(all.bookings.map((x: { date: string }) => x.date)).toEqual(["2026-10-15", "2026-10-12", "2026-10-05"]);
    const visited = await (await listRange(req("/api/admin/bookings?from=2026-09-20&to=2026-10-19&status=visited", { cookie: cookie() }))).json();
    expect(visited.bookings).toHaveLength(2);
    for (const q of ["from=2026-10-19&to=2026-10-01", "from=x&to=2026-10-01", "from=2026-10-01&to=2026-10-02&status=gone", "from=2024-01-01&to=2026-10-02"]) {
      expect((await listRange(req(`/api/admin/bookings?${q}`, { cookie: cookie() }))).status).toBe(400);
    }
  });

  it("searches by name or phone digits through a POST body", async () => {
    await memoryStore.create(base);
    await memoryStore.create({ ...base, name: "Divya", phone: "9123456789" });
    const byName = await (await search(req("/api/admin/search", { method: "POST", body: { q: "priya" }, cookie: cookie() }))).json();
    expect(byName.bookings.map((b: { name: string }) => b.name)).toEqual(["Priya Sharma"]);
    const byPhone = await (await search(req("/api/admin/search", { method: "POST", body: { q: "6789" }, cookie: cookie() }))).json();
    expect(byPhone.bookings.map((b: { name: string }) => b.name)).toEqual(["Divya"]);
    expect((await search(req("/api/admin/search", { method: "POST", body: { q: "a" }, cookie: cookie() }))).status).toBe(400);
  });

  it("shows a patient's every booking by phone, newest first, with notes that save", async () => {
    const first = await memoryStore.create({ ...base, date: "2026-09-01", source: "google_ads", campaign: "pregnancy-care-vizag" });
    await memoryStore.updateStatus(first.id, "visited");
    const second = await memoryStore.create({ ...base, date: "2026-10-22" });
    await memoryStore.create({ ...base, name: "Someone else", phone: "9123456789" });
    const res = await patientHistory(req(`/api/admin/patients/${second.id}`, { cookie: cookie() }), patientCtx(second.id));
    const data = await res.json();
    expect(data.visits.map((b: { date: string }) => b.date)).toEqual(["2026-10-22", "2026-09-01"]);
    expect(data.notes).toBeNull();
    const saved = await saveNotes(req(`/api/admin/patients/${first.id}`, { method: "PUT", body: { notes: "  Prefers evenings. " }, cookie: cookie() }), patientCtx(first.id));
    expect((await saved.json()).notes.notes).toBe("Prefers evenings.");
    const again = await (await patientHistory(req(`/api/admin/patients/${second.id}`, { cookie: cookie() }), patientCtx(second.id))).json();
    expect(again.notes.notes).toBe("Prefers evenings.");
    expect((await patientHistory(req("/api/admin/patients/nope", { cookie: cookie() }), patientCtx("nope"))).status).toBe(404);
    expect((await saveNotes(req(`/api/admin/patients/${first.id}`, { method: "PUT", body: { notes: "x".repeat(2001) }, cookie: cookie() }), patientCtx(first.id))).status).toBe(400);
    const list = await (await patientList(req("/api/admin/patients", { cookie: cookie() }))).json();
    expect(list.patients).toHaveLength(2);
    expect(list.patients.find((p: { phone: string }) => p.phone === base.phone)).toMatchObject({ bookings: 2, visits: 1, source: "google_ads", campaign: "pregnancy-care-vizag" });
  });
});

describe("POST /api/admin/demo/reset", () => {
  it("replaces demo rows and never touches real bookings", async () => {
    const real = await memoryStore.create(base);
    await memoryStore.updateStatus(real.id, "visited");
    const first = await (await resetDemo(req("/api/admin/demo/reset", { method: "POST", cookie: cookie() }))).json();
    expect(first).toEqual({ ok: true, deleted: 0, inserted: 45 });
    const demo = (await memoryStore.list({})).filter((b) => b.isDemo);
    await memoryStore.updateStatus(demo[0].id, "cancelled");
    const second = await (await resetDemo(req("/api/admin/demo/reset", { method: "POST", cookie: cookie() }))).json();
    expect(second).toEqual({ ok: true, deleted: 45, inserted: 45 });
    expect(await memoryStore.get(real.id)).toMatchObject({ status: "visited", isDemo: false, name: "Priya Sharma" });
    expect(await memoryStore.list({})).toHaveLength(46);
    // Dates are relative to today in clinic time.
    const live = await (await GET(req("/api/bookings", { cookie: cookie() }))).json();
    expect(live.needsAction).toHaveLength(4);
    expect(live.bookings.filter((b: { date: string; isDemo: boolean }) => b.date === TODAY && b.isDemo)).toHaveLength(5);
  });

  it("is refused when DEMO_RESET_DISABLED=1", async () => {
    vi.stubEnv("DEMO_RESET_DISABLED", "1");
    const res = await resetDemo(req("/api/admin/demo/reset", { method: "POST", cookie: cookie() }));
    expect(res.status).toBe(403);
    expect(await memoryStore.list({})).toEqual([]);
  });

  it("confirming a demo booking never calls a provider, and records skipped (demo)", async () => {
    vi.stubEnv("WHATSAPP_FAKE", "");
    vi.stubEnv("WHATSAPP_PROVIDER", "twilio");
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC00000000000000000000000000000000");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "made-up");
    vi.stubEnv("TWILIO_WHATSAPP_FROM", "+14155238886");
    await resetDemo(req("/api/admin/demo/reset", { method: "POST", cookie: cookie() }));
    const live = await (await GET(req("/api/bookings", { cookie: cookie() }))).json();
    const waiting = live.needsAction.find((b: { status: string }) => b.status === "new");
    await PATCH(req(`/api/bookings/${waiting.id}`, { method: "PATCH", body: { status: "confirmed" }, cookie: cookie() }), idCtx(waiting.id));
    await vi.waitFor(async () => expect(await memoryStore.listMessagesForBookings([waiting.id])).toMatchObject([{ template: "skipped (demo)", provider: "fake" }]));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logs.some((l) => /skipped \(demo\)/.test(l))).toBe(true);
    const after = await (await GET(req("/api/bookings", { cookie: cookie() }))).json();
    expect(after.bookings.find((b: { id: string }) => b.id === waiting.id).whatsapp).toMatchObject({ skipped: true });
  });
});
