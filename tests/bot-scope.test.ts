// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The Neon driver is replaced: these tests check what botQuery sends and that refusals happen before any SQL.
// tests/bot-rls.test.ts runs the same statements on a real Postgres engine.
const transaction = vi.fn();
const query = vi.fn((text: string, params: unknown[]) => ({ text, params }));
const neon = vi.fn(() => ({ query, transaction }));
vi.mock("@neondatabase/serverless", () => ({ neon }));

const { BOT_TABLES, BotSqlError, botQuery, botStatements, businessId, scopeMemoryRows, UnknownBusinessError } = await import("@/lib/db/botScope");
type BusinessId = import("@/lib/db/botScope").BusinessId;

describe("businessId", () => {
  it("accepts only businesses on the server's allow-list", () => {
    expect(businessId("lotus-clinic")).toBe("lotus-clinic");
    expect(businessId("kalyani-tiles")).toBe("kalyani-tiles");
    for (const raw of ["", "Lotus-Clinic", "lotus-clinic ", "other-clinic", "lotus-clinic' OR '1'='1", null, undefined, 42, {}, ["lotus-clinic"]]) {
      expect(() => businessId(raw), String(raw)).toThrow(UnknownBusinessError);
    }
  });

  it("keeps the raw value out of the error message", () => {
    expect(() => businessId("<script>")).toThrow("unknown business id");
  });
});

describe("botQuery (Neon driver mocked)", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgres://test-only.invalid/db");
    transaction.mockReset();
    query.mockClear();
    neon.mockClear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("sends one read-only transaction: switch to ogi_bot, set the business for this transaction, then the read", async () => {
    transaction.mockResolvedValue([[], [{ set_config: "lotus-clinic" }], [{ id: "b1" }]]);
    const rows = await botQuery(businessId("lotus-clinic"), "SELECT id FROM bookings WHERE date = $1", ["2026-11-20"]);
    expect(rows).toEqual([{ id: "b1" }]);
    expect(transaction).toHaveBeenCalledTimes(1);
    const [queries, opts] = transaction.mock.calls[0];
    expect(opts).toEqual({ readOnly: true });
    expect(queries).toEqual([
      { text: "SET LOCAL ROLE ogi_bot", params: [] },
      { text: "SELECT set_config('app.business_id', $1, true)", params: ["lotus-clinic"] },
      { text: "SELECT id FROM bookings WHERE date = $1", params: ["2026-11-20"] },
    ]);
  });

  it("attack: rejects an unknown business before any SQL runs, even one cast past the type", async () => {
    for (const fake of ["other-clinic", "", "lotus-clinic; DROP TABLE bookings"]) {
      await expect(botQuery(fake as BusinessId, "SELECT 1")).rejects.toThrow(UnknownBusinessError);
    }
    expect(neon).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it("attack: refuses writes, several statements, and anything that changes the role or the business, before any SQL runs", async () => {
    const id = businessId("lotus-clinic");
    for (const text of [
      "DELETE FROM bookings",
      "INSERT INTO bookings (name) VALUES ('x')",
      "UPDATE bookings SET name = 'x'",
      "SELECT 1; DELETE FROM bookings",
      "SELECT set_config('app.business_id', 'kalyani-tiles', true)",
      "SELECT set_config('role', 'none', true)",
      "RESET ROLE",
      "SET ROLE neondb_owner",
      "SELECT 1 FROM bookings WHERE current_setting('role') = 'x'",
      "WITH x AS (SELECT 1) SELECT * FROM x; RESET ROLE",
    ]) {
      await expect(botQuery(id, text), text).rejects.toThrow(BotSqlError);
    }
    expect(transaction).not.toHaveBeenCalled();
  });

  it("allows plain SELECT and WITH reads", () => {
    const id = businessId("kalyani-tiles");
    expect(botStatements(id, "WITH open AS (SELECT * FROM crm_followups WHERE done_at IS NULL) SELECT count(*) FROM open")).toHaveLength(3);
    expect(botStatements(id, "select name from crm_products order by name limit 5 offset 5")).toHaveLength(3);
  });

  it("fails without a database rather than reading unscoped", async () => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(botQuery(businessId("lotus-clinic"), "SELECT 1")).rejects.toThrow(/DATABASE_URL/);
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("scopeMemoryRows (the memory-store path)", () => {
  const bookings = [
    { id: "b1", clinicSlug: "lotus-clinic" },
    { id: "b2", clinicSlug: "lotus-clinic", businessId: "kalyani-tiles" },
  ];
  const leads = [{ id: "l1", shopSlug: "kalyani-tiles" }];
  const messages = [
    { id: "m1", bookingId: "b1" },
    { id: "m2", crmLeadId: "l1" },
    { id: "m3", leadId: "l1" },
  ];

  it("attack: the bot for lotus-clinic gets zero CRM rows and no CRM messages", () => {
    const id = businessId("lotus-clinic");
    for (const table of Object.keys(BOT_TABLES) as (keyof typeof BOT_TABLES)[]) {
      if (BOT_TABLES[table] === "kalyani-tiles") expect(scopeMemoryRows(id, table, leads), table).toEqual([]);
    }
    expect(scopeMemoryRows(id, "messages", messages).map((m) => m.id)).toEqual(["m1"]);
    expect(scopeMemoryRows(id, "bookings", bookings).map((b) => b.id)).toEqual(["b1"]);
  });

  it("gives kalyani-tiles its CRM rows and the CRM messages, by the same rule as the database", () => {
    const id = businessId("kalyani-tiles");
    expect(scopeMemoryRows(id, "crm_leads", leads)).toEqual(leads);
    expect(scopeMemoryRows(id, "bookings", bookings).map((b) => b.id)).toEqual(["b2"]);
    expect(scopeMemoryRows(id, "messages", messages).map((m) => m.id)).toEqual(["m2", "m3"]);
  });

  it("returns copies, and rejects an unknown business or table", () => {
    const id = businessId("lotus-clinic");
    const [copy] = scopeMemoryRows(id, "bookings", bookings);
    expect(copy).not.toBe(bookings[0]);
    expect(() => scopeMemoryRows("nope" as BusinessId, "bookings", bookings)).toThrow(UnknownBusinessError);
    expect(() => scopeMemoryRows(id, "users" as "bookings", bookings)).toThrow(BotSqlError);
  });
});
