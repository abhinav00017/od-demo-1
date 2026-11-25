// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listEnquiries } from "@/app/api/cafe/admin/enquiries/route";
import { PATCH as patchEnquiry } from "@/app/api/cafe/admin/enquiries/[id]/route";
import { POST as createEnquiry } from "@/app/api/cafe/enquiries/route";
import { POST as login } from "@/app/api/cafe/login/route";
import { POST as logout } from "@/app/api/cafe/logout/route";
import { GET as session } from "@/app/api/cafe/session/route";
import { VENUES, venueById } from "@/demos/solstice-cafe/events";
import { CAFE_AUTH, CRM_AUTH, DEV_PASSWORD, LOTUS_AUTH, signSession } from "@/lib/admin/auth";
import { schemaStatements } from "@/lib/bookings/migrations";
import { CAFE_SLUG, referenceOf, type NewEnquiry } from "@/lib/cafeEvents";
import { memoryEnquiryStore, resetMemoryEnquiries } from "@/lib/cafeEvents/memory";
import { postgresEnquiryStore } from "@/lib/cafeEvents/postgres";
import { addDays, checkEnquiry, indiaToday, normaliseMobile } from "@/lib/cafeEvents/validation";
import { resetRateLimits } from "@/lib/rateLimit";

// Wednesday 25 Nov 2026, 11:30 in India.
const NOW = new Date("2026-11-25T06:00:00Z");
const TODAY = "2026-11-25";
const SECRET = "shared-secret";
const SOLSTICE = "org_4v8c1n";

const courtyard = venueById("courtyard")!;
const conservatory = venueById("conservatory")!;

/** A valid enquiry body for The Courtyard, as the form sends it. */
const good = (over: Record<string, unknown> = {}) => ({
  venue: "courtyard",
  eventType: "birthday",
  date: "2026-12-12",
  slot: "evening",
  guests: 25,
  name: "  Asha Rao ",
  phone: "+91 98765 43210",
  notes: " Chocolate cake, please. ",
  ...over,
});

const newEnquiry = (over: Partial<NewEnquiry> = {}): NewEnquiry => ({
  cafeSlug: CAFE_SLUG,
  venue: "conservatory",
  eventType: "small_function",
  date: "2026-12-20",
  slot: "brunch",
  guests: 12,
  name: "Meera Iyer",
  phone: "9876543210",
  notes: "",
  source: "website",
  campaign: null,
  utm: null,
  channel: "form",
  ...over,
});

describe("enquiry checks (the same schema runs in the form and the API)", () => {
  it("accepts a good enquiry and cleans it: 10-digit phone, trimmed name and notes", () => {
    const r = checkEnquiry(good(), TODAY);
    expect(r).toEqual({
      ok: true,
      data: { venue: "courtyard", eventType: "birthday", date: "2026-12-12", slot: "evening", guests: 25, name: "Asha Rao", phone: "9876543210", notes: "Chocolate cake, please." },
    });
    expect(checkEnquiry(good({ notes: undefined }), TODAY)).toMatchObject({ ok: true, data: { notes: "" } });
  });

  it("reads a mobile number typed any common way, and refuses others", () => {
    for (const v of ["9876543210", "+91 98765 43210", "+919876543210", "09876543210", "98765-43210", "0091 9876543210"]) expect(normaliseMobile(v), v).toBe("9876543210");
    for (const v of ["", "12345", "5876543210", "98765432101", "+1 9876543210", "abcdefghij"]) expect(normaliseMobile(v), v).toBeUndefined();
    expect(checkEnquiry(good({ phone: "12345" }), TODAY)).toMatchObject({ ok: false, fieldErrors: { phone: "Enter a 10-digit Indian mobile number, like 98765 43210." } });
    expect(checkEnquiry(good({ phone: " " }), TODAY)).toMatchObject({ ok: false, fieldErrors: { phone: "Enter your mobile number." } });
  });

  it("takes today and up to six months ahead, never a past or made-up date", () => {
    expect(checkEnquiry(good({ date: TODAY }), TODAY).ok).toBe(true);
    expect(checkEnquiry(good({ date: addDays(TODAY, 180) }), TODAY).ok).toBe(true);
    expect(checkEnquiry(good({ date: "2026-11-24" }), TODAY)).toMatchObject({ ok: false, fieldErrors: { date: "Pick today or a later date." } });
    expect(checkEnquiry(good({ date: addDays(TODAY, 181) }), TODAY)).toMatchObject({ ok: false, fieldErrors: { date: "Pick a date within the next six months." } });
    for (const date of ["2026-02-30", "12/12/2026", "", undefined]) expect(checkEnquiry(good({ date }), TODAY), String(date)).toMatchObject({ ok: false, fieldErrors: { date: expect.any(String) } });
  });

  it("caps guests by the venue, with its own minimum", () => {
    expect(checkEnquiry(good({ guests: 40 }), TODAY).ok).toBe(true);
    expect(checkEnquiry(good({ guests: 15 }), TODAY).ok).toBe(true);
    expect(checkEnquiry(good({ guests: 41 }), TODAY)).toMatchObject({ ok: false, fieldErrors: { guests: "The Courtyard takes 15 to 40 guests." } });
    expect(checkEnquiry(good({ guests: 14 }), TODAY)).toMatchObject({ ok: false, fieldErrors: { guests: "The Courtyard takes 15 to 40 guests." } });
    const conserv = good({ venue: "conservatory", slot: "brunch" });
    expect(checkEnquiry({ ...conserv, guests: 20 }, TODAY).ok).toBe(true);
    expect(checkEnquiry({ ...conserv, guests: 25 }, TODAY)).toMatchObject({ ok: false, fieldErrors: { guests: "The Conservatory takes 8 to 20 guests." } });
    expect(checkEnquiry(good({ guests: 20.5 }), TODAY)).toMatchObject({ ok: false, fieldErrors: { guests: "Enter a whole number of guests." } });
    expect(checkEnquiry(good({ guests: "25" }), TODAY)).toMatchObject({ ok: false, fieldErrors: { guests: "Enter the number of guests." } });
    expect(checkEnquiry(good({ guests: undefined }), TODAY)).toMatchObject({ ok: false, fieldErrors: { guests: "Enter the number of guests." } });
  });

  it("only takes the venue's own time slots, a known event type and a known venue", () => {
    expect(checkEnquiry(good({ slot: "brunch" }), TODAY)).toMatchObject({ ok: false, fieldErrors: { slot: "Choose a time." } });
    expect(checkEnquiry(good({ eventType: "wedding" }), TODAY)).toMatchObject({ ok: false, fieldErrors: { eventType: "Choose the type of event." } });
    expect(checkEnquiry(good({ venue: "rooftop" }), TODAY)).toEqual({ ok: false, fieldErrors: { venue: "Choose a venue." } });
    expect(checkEnquiry("nope", TODAY)).toMatchObject({ ok: false });
  });

  it("asks for a name and keeps notes short", () => {
    expect(checkEnquiry(good({ name: " A " }), TODAY)).toMatchObject({ ok: false, fieldErrors: { name: "Enter your name." } });
    expect(checkEnquiry(good({ notes: "x".repeat(501) }), TODAY)).toMatchObject({ ok: false, fieldErrors: { notes: "Keep the notes under 500 characters." } });
  });

  it("knows today in India, not in the server's time zone", () => {
    expect(indiaToday(new Date("2026-11-25T18:29:00Z"))).toBe("2026-11-25");
    expect(indiaToday(new Date("2026-11-25T18:31:00Z"))).toBe("2026-11-26");
  });

  it("keeps the venue data sane: two venues, slots, photos, and a sensible guest range", () => {
    expect(VENUES.map((v) => v.id)).toEqual(["courtyard", "conservatory"]);
    expect([courtyard.minGuests, courtyard.maxGuests, conservatory.minGuests, conservatory.maxGuests]).toEqual([15, 40, 8, 20]);
    for (const v of VENUES) {
      expect(v.photos.length).toBeGreaterThanOrEqual(5);
      for (const p of v.photos) {
        expect(p.src.startsWith("/demos/solstice/")).toBe(true);
        expect(p.alt.length).toBeGreaterThan(10);
        if (p.src.includes("/events/")) expect(p.credit?.sourceUrl).toMatch(/^https:\/\/unsplash\.com\/photos\//);
      }
    }
  });
});

describe("the in-memory enquiry store", () => {
  beforeEach(() => resetMemoryEnquiries());

  it("saves an enquiry as new, with a reference from its id, and lists newest first", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    const first = await memoryEnquiryStore.create(newEnquiry({ name: "First" }));
    vi.setSystemTime(new Date(NOW.getTime() + 60_000));
    const second = await memoryEnquiryStore.create(newEnquiry({ name: "Second" }));
    vi.useRealTimers();
    expect(first).toMatchObject({ status: "new", statusUpdatedAt: null, reference: referenceOf(first.id) });
    expect(first.reference).toMatch(/^EV-[0-9A-F]{8}$/);
    expect((await memoryEnquiryStore.list(CAFE_SLUG)).map((e) => e.name)).toEqual(["Second", "First"]);
    expect(second.id).not.toBe(first.id);
  });

  it("changes status only for the cafe that owns the enquiry", async () => {
    const e = await memoryEnquiryStore.create(newEnquiry());
    expect(await memoryEnquiryStore.setStatus("other-cafe", e.id, "confirmed")).toBeUndefined();
    const updated = await memoryEnquiryStore.setStatus(CAFE_SLUG, e.id, "contacted");
    expect(updated).toMatchObject({ status: "contacted", statusUpdatedAt: expect.any(String) });
    expect(await memoryEnquiryStore.list("other-cafe")).toEqual([]);
  });

  it("refuses a cafe slug that matches no organization, like the database trigger", async () => {
    await expect(memoryEnquiryStore.create(newEnquiry({ cafeSlug: "no-such-cafe" }))).rejects.toThrow(/no organization/);
  });
});

describe("the Postgres enquiry store on real Postgres (PGlite), with org_id filled by the database", () => {
  let db: PGlite;
  const query = async (text: string, params: unknown[]) => (await db.query(text, params)).rows as Record<string, unknown>[];
  const store = postgresEnquiryStore(query);

  beforeAll(async () => {
    db = new PGlite();
    // The app's role, as in tests/bot-rls.test.ts: not a superuser, owns the tables.
    await db.exec(`CREATE ROLE app_owner NOLOGIN CREATEROLE; GRANT CREATE ON SCHEMA public TO app_owner; SET ROLE app_owner;`);
    for (const s of schemaStatements(readFileSync(path.join(process.cwd(), "lib/bookings/schema.sql"), "utf8"))) await db.query(s);
    // A second cafe, test only, to prove one cafe never sees another's enquiries.
    await db.query(`INSERT INTO organizations (id, slug, name, product) VALUES ('org_8k2pq5', 'other-cafe', 'Other Cafe', 'cafe')`);
  }, 60_000);

  afterAll(async () => {
    await db?.close();
  });

  it("saves an enquiry, and the database labels it with the Solstice organization", async () => {
    const e = await store.create(newEnquiry());
    expect(e).toMatchObject({ cafeSlug: CAFE_SLUG, venue: "conservatory", date: "2026-12-20", guests: 12, status: "new", statusUpdatedAt: null, notes: "" });
    expect(e.reference).toBe(referenceOf(e.id));
    expect((await db.query(`SELECT org_id FROM cafe_event_enquiries WHERE id = $1`, [e.id])).rows).toEqual([{ org_id: SOLSTICE }]);
  });

  it("lists only this cafe's enquiries, newest first, and moves status for this cafe only", async () => {
    const other = await store.create(newEnquiry({ cafeSlug: "other-cafe", name: "Other Guest" }));
    expect((await db.query(`SELECT org_id FROM cafe_event_enquiries WHERE id = $1`, [other.id])).rows).toEqual([{ org_id: "org_8k2pq5" }]);
    const later = await store.create(newEnquiry({ name: "Later Guest" }));
    const list = await store.list(CAFE_SLUG);
    expect(list.map((e) => e.name)).toEqual(["Later Guest", "Meera Iyer"]);
    expect(list.every((e) => e.cafeSlug === CAFE_SLUG)).toBe(true);

    expect(await store.setStatus(CAFE_SLUG, other.id, "declined")).toBeUndefined();
    const confirmed = await store.setStatus(CAFE_SLUG, later.id, "confirmed");
    expect(confirmed).toMatchObject({ status: "confirmed", statusUpdatedAt: expect.any(String) });
    // An update keeps the organization the database chose.
    expect((await db.query(`SELECT org_id, status FROM cafe_event_enquiries WHERE id = $1`, [later.id])).rows).toEqual([{ org_id: SOLSTICE, status: "confirmed" }]);
  });

  it("is backed by the table's own checks: unknown cafe, too many guests, bad phone or status", async () => {
    await expect(store.create(newEnquiry({ cafeSlug: "no-such-cafe" }))).rejects.toThrow(/no organization has this/);
    await expect(store.create(newEnquiry({ guests: 41 }))).rejects.toThrow(/check/);
    await expect(store.create(newEnquiry({ phone: "12345" }))).rejects.toThrow(/check/);
    const e = await store.create(newEnquiry());
    await expect(store.setStatus(CAFE_SLUG, e.id, "maybe" as never)).rejects.toThrow(/check/);
  });
});

describe("the enquiry API and the cafe owner login", () => {
  const req = (url: string, init: { method?: string; body?: unknown; cookie?: string; ip?: string } = {}) => {
    const headers: Record<string, string> = { "content-type": "application/json", "x-forwarded-for": init.ip ?? "203.0.113.20" };
    if (init.cookie) headers.cookie = init.cookie;
    return new NextRequest(`http://localhost${url}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : typeof init.body === "string" ? init.body : JSON.stringify(init.body),
    });
  };
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
  const cookieFor = (area: typeof CAFE_AUTH, secret = SECRET) => `${area.cookie}=${signSession(secret, Date.now(), undefined, area.scope)}`;
  const cafeCookie = () => cookieFor(CAFE_AUTH);
  const logs: string[] = [];

  beforeAll(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });
  afterAll(() => vi.useRealTimers());

  beforeEach(() => {
    resetMemoryEnquiries();
    resetRateLimits();
    logs.length = 0;
    vi.stubEnv("DATABASE_URL", "");
    // One secret for all three areas: only the scope keeps them apart.
    vi.stubEnv("CAFE_ADMIN_PASSWORD", "cafe-pass");
    vi.stubEnv("CAFE_ADMIN_SECRET", SECRET);
    vi.stubEnv("ADMIN_PASSWORD", "lotus-pass");
    vi.stubEnv("ADMIN_SECRET", SECRET);
    vi.stubEnv("CRM_ADMIN_PASSWORD", "crm-pass");
    vi.stubEnv("CRM_ADMIN_SECRET", SECRET);
    for (const level of ["log", "error", "warn", "info"] as const) {
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => void logs.push(args.map(String).join(" ")));
    }
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("saves a good enquiry (201 with a reference) and the owner then sees it, with India's today", async () => {
    const res = await createEnquiry(req("/api/cafe/enquiries", { method: "POST", body: good() }));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { ok: boolean; reference: string };
    expect(body.reference).toMatch(/^EV-[0-9A-F]{8}$/);

    const list = await listEnquiries(req("/api/cafe/admin/enquiries", { cookie: cafeCookie() }));
    expect(list.status).toBe(200);
    expect(list.headers.get("cache-control")).toBe("no-store");
    const data = (await list.json()) as { today: string; storage: string; enquiries: { reference: string; phone: string; name: string; status: string }[] };
    expect(data).toMatchObject({ today: TODAY, storage: "memory" });
    expect(data.enquiries).toEqual([expect.objectContaining({ reference: body.reference, phone: "9876543210", name: "Asha Rao", status: "new" })]);
  });

  it("answers 400 with field errors, and saves nothing", async () => {
    const res = await createEnquiry(req("/api/cafe/enquiries", { method: "POST", body: good({ guests: 99, date: "2026-11-01" }) }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { fieldErrors: Record<string, string> };
    expect(body.fieldErrors).toEqual({ date: "Pick today or a later date.", guests: "The Courtyard takes 15 to 40 guests." });
    expect((await createEnquiry(req("/api/cafe/enquiries", { method: "POST", body: "{not json" }))).status).toBe(400);
    expect(await memoryEnquiryStore.list(CAFE_SLUG)).toEqual([]);
  });

  it("gives a filled honeypot a normal 201 and saves nothing", async () => {
    const res = await createEnquiry(req("/api/cafe/enquiries", { method: "POST", body: good({ company: "Spam Ltd" }) }));
    expect(res.status).toBe(201);
    expect(await memoryEnquiryStore.list(CAFE_SLUG)).toEqual([]);
  });

  it("limits enquiries to 10 a minute per IP", async () => {
    for (let i = 0; i < 10; i++) expect((await createEnquiry(req("/api/cafe/enquiries", { method: "POST", body: good() }))).status).toBe(201);
    expect((await createEnquiry(req("/api/cafe/enquiries", { method: "POST", body: good() }))).status).toBe(429);
    expect((await createEnquiry(req("/api/cafe/enquiries", { method: "POST", body: good(), ip: "203.0.113.21" }))).status).toBe(201);
  });

  it("keeps the list closed without a login: 401 for no cookie, a bad cookie, or an expired one", async () => {
    await createEnquiry(req("/api/cafe/enquiries", { method: "POST", body: good() }));
    for (const cookie of [undefined, `${CAFE_AUTH.cookie}=junk`, `${CAFE_AUTH.cookie}=${signSession(SECRET, Date.now() - 13 * 3600_000, undefined, CAFE_AUTH.scope)}`]) {
      const res = await listEnquiries(req("/api/cafe/admin/enquiries", { cookie }));
      expect(res.status, String(cookie)).toBe(401);
      expect(JSON.stringify(await res.json())).not.toContain("Asha");
    }
  });

  it("attack: a clinic or CRM cookie, even signed with the same secret or renamed to cafe_session, never opens the list", async () => {
    const lotus = signSession(SECRET, Date.now(), undefined, LOTUS_AUTH.scope);
    const crm = signSession(SECRET, Date.now(), undefined, CRM_AUTH.scope);
    for (const cookie of [cookieFor(LOTUS_AUTH), cookieFor(CRM_AUTH), `${CAFE_AUTH.cookie}=${lotus}`, `${CAFE_AUTH.cookie}=${crm}`]) {
      expect((await listEnquiries(req("/api/cafe/admin/enquiries", { cookie }))).status, cookie).toBe(401);
      expect((await patchEnquiry(req("/api/cafe/admin/enquiries/x", { method: "PATCH", body: { status: "confirmed" }, cookie }), ctx("x"))).status).toBe(401);
    }
    // And the other way round: the cafe cookie means nothing to the other areas' scope.
    expect(cafeCookie()).toContain("cafe.");
  });

  it("lets the owner move an enquiry through its statuses; 404 for an unknown id, 400 for an unknown status", async () => {
    await createEnquiry(req("/api/cafe/enquiries", { method: "POST", body: good() }));
    const [e] = await memoryEnquiryStore.list(CAFE_SLUG);
    for (const status of ["contacted", "confirmed", "declined", "new"]) {
      const res = await patchEnquiry(req(`/api/cafe/admin/enquiries/${e.id}`, { method: "PATCH", body: { status }, cookie: cafeCookie() }), ctx(e.id));
      expect(res.status, status).toBe(200);
      expect(((await res.json()) as { enquiry: { status: string } }).enquiry.status).toBe(status);
    }
    const bad = await patchEnquiry(req(`/api/cafe/admin/enquiries/${e.id}`, { method: "PATCH", body: { status: "maybe" }, cookie: cafeCookie() }), ctx(e.id));
    expect(bad.status).toBe(400);
    const missing = "00000000-0000-4000-8000-000000000000";
    expect((await patchEnquiry(req(`/api/cafe/admin/enquiries/${missing}`, { method: "PATCH", body: { status: "contacted" }, cookie: cafeCookie() }), ctx(missing))).status).toBe(404);
    expect((await patchEnquiry(req(`/api/cafe/admin/enquiries/not-a-uuid`, { method: "PATCH", body: { status: "contacted" }, cookie: cafeCookie() }), ctx("not-a-uuid"))).status).toBe(404);
  });

  it("logs in with CAFE_ADMIN_PASSWORD only, sets an httpOnly cafe_session cookie, and logs out", async () => {
    expect((await login(req("/api/cafe/login", { method: "POST", body: { password: "lotus-pass" } }))).status).toBe(401);
    expect((await login(req("/api/cafe/login", { method: "POST", body: { password: "" } }))).status).toBe(401);
    const ok = await login(req("/api/cafe/login", { method: "POST", body: { password: "cafe-pass" } }));
    expect(ok.status).toBe(200);
    const setCookie = ok.headers.get("set-cookie")!;
    expect(setCookie).toMatch(/^cafe_session=cafe\.\d+\./);
    expect(setCookie).toMatch(/HttpOnly/i);
    const value = setCookie.split(";")[0];
    expect(await (await session(req("/api/cafe/session", { cookie: value }))).json()).toEqual({ configured: true, devPassword: false, authed: true });
    expect((await listEnquiries(req("/api/cafe/admin/enquiries", { cookie: value }))).status).toBe(200);
    const out = await logout();
    expect(out.headers.get("set-cookie")).toMatch(/cafe_session=;.*Max-Age=0/i);
  });

  it("uses the 'testpass' fallback only in next dev, and stays off in production without a password", async () => {
    expect(DEV_PASSWORD).toBe("testpass");
    vi.stubEnv("CAFE_ADMIN_PASSWORD", "");
    vi.stubEnv("CAFE_ADMIN_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    expect((await login(req("/api/cafe/login", { method: "POST", body: { password: "testpass" } }))).status).toBe(503);
    expect(await (await session(req("/api/cafe/session"))).json()).toEqual({ configured: false, devPassword: false, authed: false });
    vi.stubEnv("NODE_ENV", "development");
    expect(await (await session(req("/api/cafe/session"))).json()).toEqual({ configured: true, devPassword: true, authed: false });
    expect((await login(req("/api/cafe/login", { method: "POST", body: { password: "testpass" } }))).status).toBe(200);
  });

  it("rate-limits login attempts per IP", async () => {
    for (let i = 0; i < 10; i++) await login(req("/api/cafe/login", { method: "POST", body: { password: "wrong" } }));
    expect((await login(req("/api/cafe/login", { method: "POST", body: { password: "cafe-pass" } }))).status).toBe(429);
  });

  it("never logs the visitor's name or phone when a save fails", async () => {
    vi.spyOn(memoryEnquiryStore, "create").mockRejectedValueOnce(new Error("db down"));
    const res = await createEnquiry(req("/api/cafe/enquiries", { method: "POST", body: good() }));
    expect(res.status).toBe(500);
    expect(logs.join("\n")).toContain("cafe enquiry save failed: db down");
    expect(logs.join("\n")).not.toMatch(/Asha|98765/);
  });
});
