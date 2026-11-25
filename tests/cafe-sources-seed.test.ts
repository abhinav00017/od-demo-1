// @vitest-environment node
/**
 * Where cafe event enquiries come from (first-touch source, campaign, UTM tags, form or Ogi) and the demo seed
 * for the owner's list: in memory, through the API, and on real Postgres (PGlite).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listEnquiries } from "@/app/api/cafe/admin/enquiries/route";
import { POST as createEnquiry } from "@/app/api/cafe/enquiries/route";
import { attributionFrom } from "@/demos/lotus-clinic/attribution";
import { venueById } from "@/demos/solstice-cafe/events";
import { CAFE_AUTH, signSession } from "@/lib/admin/auth";
import { isDemoPhone } from "@/lib/bookings/demoPhones";
import { schemaStatements } from "@/lib/bookings/migrations";
import { PUBLIC_SOURCES } from "@/lib/bookings/sources";
import { CAFE_SLUG, ENQUIRY_STATUSES, getEnquiryStore, type Enquiry, type NewEnquiry } from "@/lib/cafeEvents";
import { generateDemoEnquiries } from "@/lib/cafeEvents/demoSeed";
import { memoryEnquiryStore, resetMemoryEnquiries } from "@/lib/cafeEvents/memory";
import { postgresEnquiryStore } from "@/lib/cafeEvents/postgres";
import { addDays, checkEnquiry } from "@/lib/cafeEvents/validation";
import { resetRateLimits } from "@/lib/rateLimit";

// Wednesday 25 Nov 2026, 11:30 in India.
const NOW = new Date("2026-11-25T06:00:00Z");
const TODAY = "2026-11-25";
const SOLSTICE = "org_4v8c1n";

const good = (over: Record<string, unknown> = {}) => ({
  venue: "courtyard",
  eventType: "birthday",
  date: "2026-12-12",
  slot: "evening",
  guests: 25,
  name: "Asha Rao",
  phone: "9876543210",
  notes: "",
  ...over,
});

describe("the demo seed (lib/cafeEvents/demoSeed.ts)", () => {
  const rows = generateDemoEnquiries(TODAY, NOW);

  it("is deterministic for the same day and time", () => {
    expect(generateDemoEnquiries(TODAY, NOW)).toEqual(rows);
    expect(rows).toHaveLength(22);
  });

  it("covers both venues, every event type, every status, every public source, past and upcoming, and a few via Ogi", () => {
    expect(new Set(rows.map((r) => r.venue))).toEqual(new Set(["courtyard", "conservatory"]));
    expect(new Set(rows.map((r) => r.eventType))).toEqual(new Set(["birthday", "small_function", "corporate", "other"]));
    expect(new Set(rows.map((r) => r.status))).toEqual(new Set(ENQUIRY_STATUSES));
    expect(new Set(rows.map((r) => r.source))).toEqual(new Set(PUBLIC_SOURCES));
    expect(rows.filter((r) => r.channel === "ogi")).toHaveLength(4);
    expect(rows.some((r) => r.date < TODAY)).toBe(true);
    expect(rows.some((r) => r.date > TODAY)).toBe(true);
    expect(rows.filter((r) => r.status === "new")).toHaveLength(4);
  });

  it("only uses made-up demo phones and fits every venue's own rules", () => {
    for (const r of rows) {
      expect(isDemoPhone(r.phone), r.phone).toBe(true);
      const venue = venueById(r.venue)!;
      expect(r.guests).toBeGreaterThanOrEqual(venue.minGuests);
      expect(r.guests).toBeLessThanOrEqual(venue.maxGuests);
      expect(venue.slots.map((s) => s.id)).toContain(r.slot);
      // Upcoming ones pass the very form a visitor uses.
      if (r.date >= TODAY) expect(checkEnquiry(r, TODAY).ok, r.name).toBe(true);
    }
    expect(new Set(rows.map((r) => r.phone)).size).toBe(rows.length);
  });

  it("keeps every time in the past, and each status change after its enquiry", () => {
    for (const r of rows) {
      expect(Date.parse(r.createdAt)).toBeLessThan(NOW.getTime());
      if (r.statusUpdatedAt) {
        expect(Date.parse(r.statusUpdatedAt)).toBeGreaterThanOrEqual(Date.parse(r.createdAt));
        expect(Date.parse(r.statusUpdatedAt)).toBeLessThan(NOW.getTime());
      } else expect(r.status).toBe("new");
      // An event that is over was asked about before it happened.
      expect(r.createdAt.slice(0, 10) <= addDays(r.date, 0)).toBe(true);
    }
  });

  it("gives ad and Google sources matching first-touch details", () => {
    const ads = rows.filter((r) => r.source === "google_ads");
    expect(ads.every((r) => r.utm?.gclid && r.utm.utm_source === "google")).toBe(true);
    expect(rows.filter((r) => r.source === "google_maps").every((r) => r.utm?.referrer === "maps.google.com")).toBe(true);
  });
});

describe("the in-memory store fills itself with the seed, as the clinic's does", () => {
  beforeEach(() => vi.stubEnv("DATABASE_URL", ""));
  afterEach(() => {
    vi.unstubAllEnvs();
    resetMemoryEnquiries();
  });

  it("seeds 22 sample enquiries on first use, once, and never on top of real ones", async () => {
    resetMemoryEnquiries({ seed: true });
    const store = getEnquiryStore();
    const list = await store.list(CAFE_SLUG);
    expect(list).toHaveLength(22);
    expect(list.every((e) => e.isDemo)).toBe(true);
    await store.create({ ...(good() as unknown as NewEnquiry), cafeSlug: CAFE_SLUG, source: "website", campaign: null, utm: null, channel: "form" });
    getEnquiryStore();
    expect(await store.list(CAFE_SLUG)).toHaveLength(23);
    // A reseed replaces only the sample rows.
    const result = await store.replaceDemo(CAFE_SLUG, generateDemoEnquiries(TODAY, NOW));
    expect(result).toEqual({ deleted: 22, inserted: 22 });
    expect((await store.list(CAFE_SLUG)).filter((e) => !e.isDemo)).toHaveLength(1);
  });
});

describe("sources through the API", () => {
  const req = (url: string, init: { method?: string; body?: unknown; cookie?: string } = {}) => {
    const headers: Record<string, string> = { "content-type": "application/json", "x-forwarded-for": "203.0.113.40" };
    if (init.cookie) headers.cookie = init.cookie;
    return new NextRequest(`http://localhost${url}`, { method: init.method ?? "GET", headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
  };
  const owner = () => `${CAFE_AUTH.cookie}=${signSession("cafe-secret", Date.now(), undefined, CAFE_AUTH.scope)}`;

  beforeAll(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });
  afterAll(() => vi.useRealTimers());
  beforeEach(() => {
    resetMemoryEnquiries();
    resetRateLimits();
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("CAFE_ADMIN_PASSWORD", "cafe-pass");
    vi.stubEnv("CAFE_ADMIN_SECRET", "cafe-secret");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("keeps a Google Ads first touch from the form, as the browser reads it from ?utm_source=google&utm_medium=cpc&gclid=x", async () => {
    const touch = attributionFrom("https://example.test/cafe/website/events/courtyard?utm_source=google&utm_medium=cpc&gclid=x", "");
    expect(touch.source).toBe("google_ads");
    expect((await createEnquiry(req("/api/cafe/enquiries", { method: "POST", body: { ...good(), ...touch } }))).status).toBe(201);
    const [e] = await memoryEnquiryStore.list(CAFE_SLUG);
    expect(e).toMatchObject({ source: "google_ads", channel: "form", utm: { utm_source: "google", utm_medium: "cpc", gclid: "x", landing: "/cafe/website/events/courtyard" } });
  });

  it("only lets the public form claim public sources, and caps what it keeps", async () => {
    for (const source of ["walk_in", "phone", "referral", "ogi", "admin", 42]) {
      await createEnquiry(req("/api/cafe/enquiries", { method: "POST", body: { ...good(), source, campaign: "x".repeat(300), utm: { utm_source: "y".repeat(500), evil: "z" } } }));
    }
    const list = await memoryEnquiryStore.list(CAFE_SLUG);
    expect(list).toHaveLength(6);
    for (const e of list) {
      expect(e.source).toBe("website");
      expect(e.channel).toBe("form");
      expect(e.campaign).toHaveLength(100);
      expect(e.utm).toEqual({ utm_source: "y".repeat(200) });
    }
  });

  it("the form can never mark itself as sent via Ogi", async () => {
    await createEnquiry(req("/api/cafe/enquiries", { method: "POST", body: { ...good(), channel: "ogi" } }));
    expect((await memoryEnquiryStore.list(CAFE_SLUG))[0].channel).toBe("form");
  });

  it("gives the owner counts per source and via Ogi, matching the list", async () => {
    await memoryEnquiryStore.replaceDemo(CAFE_SLUG, generateDemoEnquiries(TODAY, NOW));
    const body = (await (await listEnquiries(req("/api/cafe/admin/enquiries", { cookie: owner() }))).json()) as {
      enquiries: Enquiry[];
      sources: Record<string, number>;
      viaOgi: number;
    };
    expect(body.enquiries).toHaveLength(22);
    expect(body.sources).toEqual({ website: 7, google_ads: 4, meta_ads: 3, google_search: 3, google_maps: 3, whatsapp: 2 });
    expect(body.viaOgi).toBe(4);
  });
});

describe("sources and the seed on real Postgres (PGlite)", () => {
  let db: PGlite;
  const store = postgresEnquiryStore(async (text, params) => (await db.query(text, params)).rows as Record<string, unknown>[]);
  const base: NewEnquiry = { ...(good() as unknown as NewEnquiry), cafeSlug: CAFE_SLUG, source: "website", campaign: null, utm: null, channel: "form" };

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE app_owner NOLOGIN CREATEROLE; GRANT CREATE ON SCHEMA public TO app_owner; SET ROLE app_owner;`);
    const statements = schemaStatements(readFileSync(path.join(process.cwd(), "lib/bookings/schema.sql"), "utf8"));
    for (const s of statements) await db.query(s);
    for (const s of statements) await db.query(s); // Safe to rerun.
  }, 60_000);
  afterAll(async () => {
    await db?.close();
  });

  it("stores source, campaign, utm (jsonb) and channel, and reads them back", async () => {
    const e = await store.create({ ...base, source: "meta_ads", campaign: "kitty-party-brunch", utm: { utm_source: "instagram", fbclid: "abc" }, channel: "ogi" });
    expect(e).toMatchObject({ source: "meta_ads", campaign: "kitty-party-brunch", utm: { utm_source: "instagram", fbclid: "abc" }, channel: "ogi", isDemo: false });
    expect((await db.query(`SELECT org_id, pg_typeof(utm)::text AS t FROM cafe_event_enquiries WHERE id = $1`, [e.id])).rows).toEqual([{ org_id: SOLSTICE, t: "jsonb" }]);
    const plain = await store.create(base);
    expect(plain).toMatchObject({ source: "website", campaign: null, utm: null, channel: "form" });
  });

  it("refuses a source or channel outside the agreed lists", async () => {
    await expect(store.create({ ...base, source: "walk_in" as never })).rejects.toThrow(/check/);
    await expect(store.create({ ...base, channel: "email" as never })).rejects.toThrow(/check/);
  });

  it("replaces only the demo rows, in one statement, labelled with the Solstice organization", async () => {
    const realBefore = (await store.list(CAFE_SLUG)).filter((e) => !e.isDemo).length;
    const rows = generateDemoEnquiries(TODAY, NOW);
    expect(await store.replaceDemo(CAFE_SLUG, rows)).toEqual({ deleted: 0, inserted: 22 });
    expect(await store.replaceDemo(CAFE_SLUG, rows)).toEqual({ deleted: 22, inserted: 22 });
    const list = await store.list(CAFE_SLUG);
    expect(list.filter((e) => e.isDemo)).toHaveLength(22);
    expect(list.filter((e) => !e.isDemo)).toHaveLength(realBefore);
    const { rows: orgs } = await db.query<{ org_id: string; n: number }>(`SELECT org_id, count(*)::int AS n FROM cafe_event_enquiries WHERE is_demo GROUP BY 1`);
    expect(orgs).toEqual([{ org_id: SOLSTICE, n: 22 }]);
    // Times, statuses and dates come through exactly as seeded.
    const byName = new Map(list.map((e) => [e.name, e]));
    for (const r of rows) {
      const e = byName.get(r.name)!;
      expect([e.createdAt, e.status, e.statusUpdatedAt, e.date, e.channel, e.source]).toEqual([r.createdAt, r.status, r.statusUpdatedAt, r.date, r.channel, r.source]);
    }
  });

  it("refuses to seed a cafe slug with no organization", async () => {
    await expect(store.replaceDemo("no-such-cafe", generateDemoEnquiries(TODAY, NOW))).rejects.toThrow(/no organization has this/);
  });
});
