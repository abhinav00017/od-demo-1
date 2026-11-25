// @vitest-environment node
/**
 * Owner Ogi on the Solstice owner page, sample orders, and saving web orders. A fake model stands in for Gemini.
 * Checks: owner mode only with a valid cafe login (server-side), owner tools only on the owner page, read-only fixed
 * queries scoped to org_4v8c1n (memory and PGlite with a second cafe), the reply check on numbers, and server-side
 * order totals.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { MockLanguageModelV4 } from "ai/test";
import { NextRequest } from "next/server";
import { z } from "zod";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MENU_ITEMS } from "@/demos/solstice-cafe/data";
import { CAFE_AUTH, CRM_AUTH, LOTUS_AUTH, SESSION_TTL_MS, signSession } from "@/lib/admin/auth";
import { schemaStatements } from "@/lib/bookings/migrations";
import { resetMemoryEnquiries } from "@/lib/cafeEvents/memory";
import { postgresEnquiryStore } from "@/lib/cafeEvents/postgres";
import { generateDemoEnquiries } from "@/lib/cafeEvents/demoSeed";
import { CAFE_SLUG, sumTotal } from "@/lib/cafeOrders";
import { generateDemoOrders } from "@/lib/cafeOrders/demoSeed";
import { memoryOrderStore, resetMemoryOrders } from "@/lib/cafeOrders/memory";
import { postgresOrderStore } from "@/lib/cafeOrders/postgres";
import { botStatements } from "@/lib/db/botScope";
import { orderStats, readEnquiries, readOrders, resolvePeriod, topItems, type BotRead, type Range } from "@/lib/ogi/cafeOwner";
import { runOgi } from "@/lib/ogi/engine";
import { profileForPage } from "@/lib/ogi/profiles";
import { checkReply } from "@/lib/ogi/replyCheck";
import { allowedTools, OWNER_TOOL_NAMES, TOOL_INPUT_SCHEMAS } from "@/lib/ogi/tools";
import { orgId } from "@/lib/orgs";
import { resetRateLimits } from "@/lib/rateLimit";

const fake = vi.hoisted(() => ({ model: null as unknown }));
vi.mock("@/lib/ogi/model", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/ogi/model")>();
  return { ...real, getOgiModel: () => fake.model };
});

const { GET: chatGet, POST: chatPost } = await import("@/app/api/ogi/chat/route");
const { POST: orderPost } = await import("@/app/api/cafe/orders/route");
const { GET: summaryGet } = await import("@/app/api/cafe/admin/orders/route");

// Wednesday 25 Nov 2026, 11:30 in India.
const NOW = new Date("2026-11-25T06:00:00Z");
const TODAY = "2026-11-25";
const PASSWORD = "owner-test-pass";
const SOLSTICE = orgId("org_4v8c1n");
const owner = profileForPage("solstice-cafe-owner")!;
const cafe = profileForPage("solstice-cafe")!;
const lotus = profileForPage("lotus-clinic")!;

type Result = Awaited<ReturnType<MockLanguageModelV4["doGenerate"]>>;
const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 10, text: 10, reasoning: undefined },
};
const say = (text: string): Result => ({ content: [{ type: "text", text }], finishReason: { unified: "stop", raw: undefined }, usage, warnings: [] });
let callId = 0;
const call = (toolName: string, input: unknown): Result => ({
  content: [{ type: "tool-call", toolCallId: `call-${++callId}`, toolName, input: JSON.stringify(input) }],
  finishReason: { unified: "tool-calls", raw: undefined },
  usage,
  warnings: [],
});
const fakeModel = (...steps: Result[]) => new MockLanguageModelV4({ doGenerate: steps });

const cafeCookie = () => `${CAFE_AUTH.cookie}=${signSession(PASSWORD, Date.now(), SESSION_TTL_MS, CAFE_AUTH.scope)}`;

function req(url: string, init: { method?: string; body?: unknown; cookie?: string; ip?: string } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json", "x-forwarded-for": init.ip ?? "203.0.113.40" };
  if (init.cookie) headers.cookie = init.cookie;
  return new NextRequest(`http://localhost${url}`, { method: init.method ?? "GET", headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
}
const ask = (text: string, page = "solstice-cafe-owner") => ({ page, messages: [{ role: "user", content: text }] });
const chat = (body: unknown, cookie?: string) => chatPost(req("/api/ogi/chat", { method: "POST", body, cookie }));
const toolsOffered = (m: MockLanguageModelV4) => (m.doGenerateCalls[0].tools ?? []).map((t) => t.name).sort();
/** The tool results the model saw on its second call. */
const toolOutput = (m: MockLanguageModelV4) => JSON.stringify(m.doGenerateCalls[1].prompt);

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});
afterAll(() => vi.useRealTimers());

beforeEach(() => {
  resetMemoryEnquiries({ seed: true });
  resetMemoryOrders({ seed: true });
  resetRateLimits();
  fake.model = null;
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("CAFE_ADMIN_PASSWORD", PASSWORD);
  vi.stubEnv("CAFE_ADMIN_SECRET", "");
  vi.stubEnv("ADMIN_PASSWORD", PASSWORD);
  vi.stubEnv("CRM_ADMIN_PASSWORD", PASSWORD);
  for (const level of ["log", "error", "warn", "info"] as const) vi.spyOn(console, level).mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("owner mode needs the cafe login, checked on the server", () => {
  it("answers 401 on GET and POST without a cookie, and the model is never asked", async () => {
    const model = fakeModel(say("hi"));
    fake.model = model;
    expect((await chatGet(req("/api/ogi/chat?page=solstice-cafe-owner"))).status).toBe(401);
    expect((await chat(ask("How many enquiries this month?"))).status).toBe(401);
    expect(model.doGenerateCalls).toHaveLength(0);
  });

  it("attack: a clinic cookie, a CRM cookie, a CRM-scoped token in the cafe cookie, an expired or forged cafe cookie all get 401", async () => {
    fake.model = fakeModel(say("hi"));
    const lotusToken = signSession(PASSWORD, Date.now(), SESSION_TTL_MS, LOTUS_AUTH.scope);
    const crmToken = signSession(PASSWORD, Date.now(), SESSION_TTL_MS, CRM_AUTH.scope);
    const expired = signSession(PASSWORD, Date.now() - 2 * SESSION_TTL_MS, SESSION_TTL_MS, CAFE_AUTH.scope);
    const forged = signSession("not-the-secret", Date.now(), SESSION_TTL_MS, CAFE_AUTH.scope);
    for (const cookie of [
      `${LOTUS_AUTH.cookie}=${lotusToken}`,
      `${CRM_AUTH.cookie}=${crmToken}`,
      `${CAFE_AUTH.cookie}=${crmToken}`,
      `${CAFE_AUTH.cookie}=${lotusToken}`,
      `${CAFE_AUTH.cookie}=${expired}`,
      `${CAFE_AUTH.cookie}=${forged}`,
    ]) {
      expect((await chat(ask("sales last week?"), cookie)).status, cookie).toBe(401);
    }
  });

  it("with a valid cafe cookie, offers the model exactly the four read-only owner tools", async () => {
    const model = fakeModel(say("Ask me anything about your cafe."));
    fake.model = model;
    const res = await chat(ask("hello"), cafeCookie());
    expect(res.status).toBe(200);
    expect(toolsOffered(model)).toEqual([...OWNER_TOOL_NAMES].sort());
    const get = (await (await chatGet(req("/api/ogi/chat?page=solstice-cafe-owner", { cookie: cafeCookie() }))).json()) as { greeting: string; examples: string[] };
    expect(get.greeting).toMatch(/enquiries, orders and sales/);
    expect(get.examples.length).toBeGreaterThanOrEqual(3);
  });

  it("a cafe cookie on the visitor page still gets only visitor tools; a role in the body is refused", async () => {
    const model = fakeModel(say("Hello."));
    fake.model = model;
    expect((await chat(ask("hi", "solstice-cafe"), cafeCookie())).status).toBe(200);
    expect(toolsOffered(model)).toEqual(["cafe_info", "hand_over", "request_event_enquiry"]);
    expect((await chat({ ...ask("hi", "solstice-cafe"), role: "owner" }, cafeCookie())).status).toBe(400);
  });

  it("owner tools exist only for the owner role on the owner profile (deny by default)", () => {
    expect(allowedTools("owner", owner).sort()).toEqual([...OWNER_TOOL_NAMES].sort());
    expect(allowedTools("visitor", owner)).toEqual([]);
    expect(allowedTools("owner", cafe)).toEqual([]);
    expect(allowedTools("owner", lotus)).toEqual([]);
    for (const name of OWNER_TOOL_NAMES) expect(name).not.toMatch(/set|update|delete|create|change|confirm|cancel|send|write/);
  });

  it("Lock 3: no owner tool input has a business, page, role, org or SQL field", () => {
    const BAD = /business|tenant|clinic|shop|store|company|org|account|owner|role|page|slug|sql|query|table|column|where|^id$|_id$|Id$/i;
    const names = (schema: unknown): string[] => {
      if (!schema || typeof schema !== "object") return [];
      const s = schema as Record<string, unknown>;
      const own = s.properties && typeof s.properties === "object" ? Object.keys(s.properties) : [];
      return [...own, ...Object.values(s).flatMap((v) => (Array.isArray(v) ? v.flatMap(names) : names(v)))];
    };
    for (const name of OWNER_TOOL_NAMES) {
      const fields = names(z.toJSONSchema(TOOL_INPUT_SCHEMAS[name]));
      expect(fields.length, name).toBeGreaterThan(0);
      for (const f of fields) expect(f, `${name}.${f}`).not.toMatch(BAD);
    }
  });
});

describe("owner tools answer from the cafe's own data (memory store, self-seeded)", () => {
  it("top_items names Charminar Saffron Irani Chai as the clear best seller, and the answer passes the reply check", async () => {
    const range = resolvePeriod("last_30_days", TODAY) as Range;
    const top = topItems(await readOrders(SOLSTICE, range), range, { rank: "best", by: "quantity", limit: 3 }, MENU_ITEMS);
    expect(top.items[0].name).toBe("Charminar Saffron Irani Chai");
    expect(top.items[0].itemsSold).toBeGreaterThan(top.items[1].itemsSold * 1.5);
    const reply = `In the last 30 days your best seller was ${top.items[0].name}, with ${top.items[0].itemsSold} sold.`;
    const model = fakeModel(call("top_items", { period: "last_30_days", limit: 3 }), say(reply));
    fake.model = model;
    const body = (await (await chat(ask("What is the best-selling item?"), cafeCookie())).json()) as { reply: string; kind: string };
    expect(body).toEqual({ ok: true, reply, kind: "answer" });
    expect(toolOutput(model)).toContain("Charminar Saffron Irani Chai");
  });

  it("order_stats gives sales last week in rupees, and weekends are busier than weekdays", async () => {
    const range = resolvePeriod("last_week", TODAY) as Range;
    expect(range).toMatchObject({ from: "2026-11-16", to: "2026-11-22" });
    const stats = orderStats(await readOrders(SOLSTICE, range), range, { groupBy: "weekday" }) as { orders: number; sales: string; groups: { label: string; orders: number }[] };
    expect(stats.orders).toBeGreaterThan(150);
    expect(stats.sales).toMatch(/^₹\d{1,2},\d{2},\d{3}$|^₹\d{2},\d{3}$/);
    expect(["Sunday", "Saturday"]).toContain(stats.groups[0].label);
    const reply = `Last week (16 to 22 November) you had ${stats.orders} orders and ${stats.sales} in sales.`;
    fake.model = fakeModel(call("order_stats", { period: "last_week" }), say(reply));
    const body = (await (await chat(ask("What were sales last week?"), cafeCookie())).json()) as { reply: string; kind: string };
    expect(body.kind).toBe("answer");
    expect(body.reply).toBe(reply);
  });

  it("enquiry_stats counts leads by source and venue, and confirmed events next week by event day", async () => {
    const model = fakeModel(
      call("enquiry_stats", { period: "all_time", groupBy: "source" }),
      call("enquiry_stats", { period: "next_week", dateBasis: "event_date", status: "confirmed" }),
      say("Done."),
    );
    await runOgi({ profile: owner, role: "owner", messages: [{ role: "user", content: "leads by source, and confirmed events next week" }], model, today: TODAY });
    const seen = JSON.stringify(model.doGenerateCalls[2].prompt);
    expect(seen).toContain("Google Ads");
    expect(seen).toContain("Website");
    expect(seen).toContain("event day");
    const all = await readEnquiries(SOLSTICE);
    expect(all).toHaveLength(22);
  });

  it("the reply check blocks a number that is not in the tool results, and says the owner fallback", async () => {
    fake.model = fakeModel(call("order_stats", { period: "last_7_days" }), say("You had 987654 orders in the last 7 days."));
    const body = (await (await chat(ask("orders last 7 days?"), cafeCookie())).json()) as { reply: string; kind: string };
    expect(body.kind).toBe("blocked");
    expect(body.reply).toBe(owner.fallback);
    expect(checkReply("Profit was ₹50,000.", { profile: owner, toolResults: ['{"sales":"₹1,20,000"}'] })).toMatchObject({ ok: false });
    expect(checkReply("Sales were ₹1,20,000 in 7 days.", { profile: owner, toolResults: ['{"sales":"₹1,20,000","days":7}'] })).toEqual({ ok: true });
    // Visitor pages keep their old check: a plain count is fine there.
    expect(checkReply("The Courtyard takes up to 40 guests.", { profile: cafe })).toEqual({ ok: true });
  });

  it("a bad custom period is refused by the tool, not run", async () => {
    const model = fakeModel(call("order_stats", { period: "custom", from: "2020-01-01", to: "2026-11-25" }), say("Please pick a shorter period."));
    await runOgi({ profile: owner, role: "owner", messages: [{ role: "user", content: "all sales since 2020" }], model, today: TODAY });
    expect(toolOutput(model)).toContain("at most 366 days");
  });
});

describe("owner tools read only org_4v8c1n on Postgres (PGlite, a second cafe in the same tables)", () => {
  let db: PGlite;
  const query = async (text: string, params: unknown[]) => (await db.query(text, params)).rows as Record<string, unknown>[];
  /** The bot read exactly as botQuery sends it: one read-only transaction, ogi_bot, app.org_id. */
  const pgRead: BotRead = async (org, text, params) => {
    const steps = botStatements(org, text, params);
    await db.query("BEGIN READ ONLY");
    try {
      let rows: unknown[] = [];
      for (const s of steps) rows = (await db.query(s.text, s.params)).rows;
      await db.query("COMMIT");
      return rows as Record<string, unknown>[];
    } catch (err) {
      await db.query("ROLLBACK");
      throw err;
    }
  };

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE app_owner NOLOGIN CREATEROLE; GRANT CREATE ON SCHEMA public TO app_owner; SET ROLE app_owner;`);
    for (const s of schemaStatements(readFileSync(path.join(process.cwd(), "lib/bookings/schema.sql"), "utf8"))) await db.query(s);
    await db.query(`INSERT INTO organizations (id, slug, name, product) VALUES ('org_8k2pq5', 'other-cafe', 'Other Cafe', 'cafe')`);
    const orders = postgresOrderStore(query);
    await orders.replaceDemo(CAFE_SLUG, generateDemoOrders(TODAY, NOW));
    await postgresEnquiryStore(query).replaceDemo(CAFE_SLUG, generateDemoEnquiries(TODAY, NOW));
    // The other cafe: 50 huge orders of one item, and enquiries, all this month. None may reach Solstice's owner.
    const big = [{ id: "gongura-pesto-pizza", name: "Gongura Pesto Pizza", category: "Deccan Spiced Pizzas", qty: 20, unitPrice: 740 }];
    await orders.replaceDemo("other-cafe", Array.from({ length: 50 }, (_, i) => ({ createdAt: `2026-11-2${i % 5}T06:00:00Z`, channel: "website" as const, items: big, fulfilment: null, name: null, phone: null, source: null })));
    await postgresEnquiryStore(query).replaceDemo("other-cafe", generateDemoEnquiries(TODAY, NOW));
  }, 60_000);

  afterAll(async () => {
    await db?.close();
  });

  it("stores the sample orders with org_id from the database, items as jsonb and is_demo", async () => {
    const { rows } = await db.query<{ org_id: string; n: number; t: string }>(
      `SELECT org_id, count(*)::int AS n, min(pg_typeof(items)::text) AS t FROM cafe_orders WHERE is_demo GROUP BY 1 ORDER BY 1`,
    );
    expect(rows.map((r) => r.org_id)).toEqual(["org_4v8c1n", "org_8k2pq5"]);
    expect(rows[0].n).toBeGreaterThan(1500);
    expect(rows[0].t).toBe("jsonb");
  });

  it("readOrders and readEnquiries return exactly Solstice's rows, through ogi_bot and RLS", async () => {
    const range = resolvePeriod("last_30_days", TODAY) as Range;
    const got = await readOrders(SOLSTICE, range, pgRead);
    const { rows } = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM cafe_orders WHERE cafe_slug = 'solstice-cafe' AND created_at >= '2026-10-26T18:30:00Z' AND created_at < '2026-11-25T18:30:00Z'`,
    );
    expect(got).toHaveLength(rows[0].n);
    expect(got.every((o) => o.cafeSlug === CAFE_SLUG)).toBe(true);
    expect(await readEnquiries(SOLSTICE, pgRead)).toHaveLength(22);
  });

  it("through the engine, top_items on Postgres never counts the other cafe's 1,000 pizzas", async () => {
    const model = fakeModel(call("top_items", { period: "this_month", limit: 10 }), call("order_stats", { period: "this_month", groupBy: "channel" }), say("Done."));
    await runOgi({ profile: owner, role: "owner", messages: [{ role: "user", content: "best sellers this month" }], model, today: TODAY, botRead: pgRead });
    const seen = JSON.stringify(model.doGenerateCalls[2].prompt);
    expect(seen).toContain("Charminar Saffron Irani Chai");
    // Memory and Postgres agree for the same seed, so Postgres shows Solstice's own counts only.
    const range = resolvePeriod("this_month", TODAY) as Range;
    const pg = topItems(await readOrders(SOLSTICE, range, pgRead), range, { rank: "best", by: "quantity", limit: 10 }, MENU_ITEMS);
    const mem = topItems(await readOrders(SOLSTICE, range), range, { rank: "best", by: "quantity", limit: 10 }, MENU_ITEMS);
    expect(pg.items).toEqual(mem.items);
    const gongura = pg.items.find((i) => i.name === "Gongura & Confit Garlic Flatbread")!;
    expect(gongura.itemsSold).toBeLessThan(1000);
  });

  it("ogi_bot cannot write cafe_orders even with its organization set", async () => {
    await db.query("BEGIN");
    try {
      await db.query("SET LOCAL ROLE ogi_bot");
      await db.query(`SELECT set_config('app.org_id', 'org_4v8c1n', true)`);
      await expect(db.query(`UPDATE cafe_orders SET total = 0`)).rejects.toThrow(/permission denied/);
    } finally {
      await db.query("ROLLBACK");
    }
  });
});

describe("web orders from the tray", () => {
  const post = (body: unknown, ip?: string) => orderPost(req("/api/cafe/orders", { method: "POST", body, ip }));

  it("prices the order on the server: a tampered price or total is ignored", async () => {
    const res = await post({ items: [{ id: "niloufer-heritage-chai", qty: 2, price: 1, unitPrice: 1 }, { id: "osmania-salted-croissant", qty: 1 }], total: 3, delivery: "Courtyard Pickup", name: " Rohan " });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { reference: string; total: number };
    expect(body.total).toBe(220 * 2 + 290);
    const [saved] = (await memoryOrderStore.list(CAFE_SLUG)).filter((o) => !o.isDemo);
    expect(saved).toMatchObject({ reference: body.reference, channel: "website", total: 730, itemCount: 3, fulfilment: "pickup", name: "Rohan", isDemo: false });
    expect(saved.items.map((i) => i.unitPrice)).toEqual([220, 290]);
    expect(sumTotal(saved.items)).toBe(730);
  });

  it("refuses an unknown menu item, an empty tray or a silly quantity, and saves nothing", async () => {
    for (const body of [{ items: [{ id: "free-lunch", qty: 1 }] }, { items: [] }, { items: [{ id: "niloufer-heritage-chai", qty: 500 }] }, "nope"]) {
      expect((await post(body)).status, JSON.stringify(body)).toBe(400);
    }
    expect((await memoryOrderStore.list(CAFE_SLUG)).filter((o) => !o.isDemo)).toEqual([]);
  });

  it("a filled honeypot answers 201 and saves nothing; the endpoint is rate-limited", async () => {
    expect((await post({ items: [{ id: "niloufer-heritage-chai", qty: 1 }], company: "bot" })).status).toBe(201);
    expect((await memoryOrderStore.list(CAFE_SLUG)).filter((o) => !o.isDemo)).toEqual([]);
    const codes: number[] = [];
    for (let i = 0; i < 11; i++) codes.push((await post({ items: [{ id: "niloufer-heritage-chai", qty: 1 }] }, "198.51.100.9")).status);
    expect(codes.at(-1)).toBe(429);
  });
});

describe("the owner page's Orders summary", () => {
  it("needs the cafe login", async () => {
    expect((await summaryGet(req("/api/cafe/admin/orders"))).status).toBe(401);
  });

  it("gives orders and sales for the last 7 days and the top 3 items", async () => {
    const res = await summaryGet(req("/api/cafe/admin/orders", { cookie: cafeCookie() }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { from: string; to: string; orders: number; sales: number; top: { name: string }[] };
    expect(body).toMatchObject({ from: "2026-11-19", to: "2026-11-25" });
    expect(body.orders).toBeGreaterThan(150);
    expect(body.sales).toBeGreaterThan(100_000);
    expect(body.top).toHaveLength(3);
    expect(body.top[0].name).toBe("Charminar Saffron Irani Chai");
  });
});

describe("the sample orders", () => {
  it("are deterministic, 60 days back, none in the future, on demo phones, with mixed channels", () => {
    const a = generateDemoOrders(TODAY, NOW);
    expect(generateDemoOrders(TODAY, NOW)).toEqual(a);
    expect(a.length).toBeGreaterThan(1800);
    expect(a.every((o) => o.createdAt <= NOW.toISOString())).toBe(true);
    expect(a[0].createdAt >= "2026-09-26").toBe(true);
    expect(new Set(a.map((o) => o.channel))).toEqual(new Set(["website", "whatsapp", "walk_in"]));
    expect(a.filter((o) => o.phone).every((o) => /^9000026\d{3}$/.test(o.phone!))).toBe(true);
    for (const o of a) for (const i of o.items) expect(MENU_ITEMS.find((m) => m.id === i.id)?.price).toBe(i.unitPrice);
  });
});
