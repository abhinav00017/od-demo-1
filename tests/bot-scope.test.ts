// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The Neon driver is replaced: these tests check what botQuery sends and that refusals happen before any SQL.
// tests/bot-rls.test.ts runs the same statements on a real Postgres engine.
const transaction = vi.fn();
const query = vi.fn((text: string, params: unknown[]) => ({ text, params }));
const neon = vi.fn(() => ({ query, transaction }));
vi.mock("@neondatabase/serverless", () => ({ neon }));

const { BOT_TABLES, BotSqlError, botQuery, botStatements, scopeMemoryRows } = await import("@/lib/db/botScope");
const { orgId, UnknownOrgError } = await import("@/lib/orgs");
type OrgId = import("@/lib/orgs").OrgId;

const LOTUS = "org_7f3k2a";
const KALYANI = "org_2m9qd1";

describe("orgId", () => {
  it("accepts only organizations on the server's list", () => {
    expect(orgId(LOTUS)).toBe(LOTUS);
    expect(orgId(KALYANI)).toBe(KALYANI);
    // Slugs are not ids, and a test-only organization is not on the list.
    for (const raw of ["lotus-clinic", "kalyani-tiles", "org_9x4hb7", "", "ORG_7F3K2A", "org_7f3k2a ", "org_7f3k2a' OR '1'='1", null, undefined, 42, {}, [LOTUS]]) {
      expect(() => orgId(raw), String(raw)).toThrow(UnknownOrgError);
    }
  });

  it("keeps the raw value out of the error message", () => {
    expect(() => orgId("<script>")).toThrow("unknown organization");
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

  it("sends one read-only transaction: switch to ogi_bot, set the organization for this transaction, then the read", async () => {
    transaction.mockResolvedValue([[], [{ set_config: LOTUS }], [{ id: "b1" }]]);
    const rows = await botQuery(orgId(LOTUS), "SELECT id FROM bookings WHERE date = $1", ["2026-11-20"]);
    expect(rows).toEqual([{ id: "b1" }]);
    expect(transaction).toHaveBeenCalledTimes(1);
    const [queries, opts] = transaction.mock.calls[0];
    expect(opts).toEqual({ readOnly: true });
    expect(queries).toEqual([
      { text: "SET LOCAL ROLE ogi_bot", params: [] },
      { text: "SELECT set_config('app.org_id', $1, true)", params: [LOTUS] },
      { text: "SELECT id FROM bookings WHERE date = $1", params: ["2026-11-20"] },
    ]);
  });

  it("attack: rejects an unknown organization before any SQL runs, even one cast past the type", async () => {
    for (const fake of ["org_9x4hb7", "lotus-clinic", "", "org_7f3k2a; DROP TABLE bookings"]) {
      await expect(botQuery(fake as OrgId, "SELECT 1")).rejects.toThrow(UnknownOrgError);
    }
    expect(neon).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it("attack: refuses writes, several statements, and anything that changes the role or the organization, before any SQL runs", async () => {
    const id = orgId(LOTUS);
    for (const text of [
      "DELETE FROM bookings",
      "INSERT INTO bookings (name) VALUES ('x')",
      "UPDATE bookings SET name = 'x'",
      "SELECT 1; DELETE FROM bookings",
      `SELECT set_config('app.org_id', '${KALYANI}', true)`,
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
    const id = orgId(KALYANI);
    expect(botStatements(id, "WITH open AS (SELECT * FROM crm_followups WHERE done_at IS NULL) SELECT count(*) FROM open")).toHaveLength(3);
    expect(botStatements(id, "select name from crm_products order by name limit 5 offset 5")).toHaveLength(3);
  });

  it("fails without a database rather than reading unscoped", async () => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(botQuery(orgId(LOTUS), "SELECT 1")).rejects.toThrow(/DATABASE_URL/);
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("scopeMemoryRows (the memory-store path, same rules as the org_id triggers)", () => {
  const bookings = [
    { id: "b1", clinicSlug: "lotus-clinic" },
    // A row that claims another organization: ignored, as the trigger ignores it.
    { id: "b2", clinicSlug: "lotus-clinic", orgId: KALYANI },
    // A clinic the server does not know: the database would refuse it, so nobody sees it.
    { id: "b3", clinicSlug: "sunrise-clinic" },
  ];
  const leads = [{ id: "l1", shopSlug: "kalyani-tiles" }];
  const quotes = [{ id: "q1", shopSlug: "kalyani-tiles", leadId: "l1" }];
  const items = [
    { id: "i1", quoteId: "q1" },
    { id: "i2", quoteId: "missing" },
  ];
  const messages = [
    { id: "m1", bookingId: "b1" },
    { id: "m2", crmLeadId: "l1" },
    { id: "m3", leadId: "l1" },
    { id: "m4", bookingId: "b3" },
  ];
  const parents = { bookings, crm_leads: leads, crm_quotes: quotes };

  it("attack: the bot for Lotus gets zero CRM rows, no CRM messages and no unknown clinic's rows", () => {
    const id = orgId(LOTUS);
    for (const table of ["crm_products", "crm_leads", "crm_quotes", "crm_followups"] as const) expect(scopeMemoryRows(id, table, leads), table).toEqual([]);
    expect(scopeMemoryRows(id, "crm_quote_items", items, parents)).toEqual([]);
    expect(scopeMemoryRows(id, "messages", messages, parents).map((m) => m.id)).toEqual(["m1"]);
    expect(scopeMemoryRows(id, "bookings", bookings).map((b) => b.id)).toEqual(["b1", "b2"]);
  });

  it("gives Kalyani its CRM rows, its quote's items and its CRM messages", () => {
    const id = orgId(KALYANI);
    expect(scopeMemoryRows(id, "crm_leads", leads)).toEqual(leads);
    expect(scopeMemoryRows(id, "bookings", bookings)).toEqual([]);
    expect(scopeMemoryRows(id, "crm_quote_items", items, parents).map((i) => i.id)).toEqual(["i1"]);
    expect(scopeMemoryRows(id, "messages", messages, parents).map((m) => m.id)).toEqual(["m2", "m3"]);
  });

  it("shows no message or quote item when its parent rows are not given", () => {
    expect(scopeMemoryRows(orgId(LOTUS), "messages", messages)).toEqual([]);
    expect(scopeMemoryRows(orgId(KALYANI), "crm_quote_items", items)).toEqual([]);
  });

  it("gives the Solstice cafe its own event enquiries and nobody else's", () => {
    const enquiries = [
      { id: "e1", cafeSlug: "solstice-cafe" },
      { id: "e2", cafeSlug: "solstice-cafe", orgId: LOTUS },
      { id: "e3", cafeSlug: "other-cafe" },
    ];
    expect(scopeMemoryRows(orgId("org_4v8c1n"), "cafe_event_enquiries", enquiries).map((e) => e.id)).toEqual(["e1", "e2"]);
    expect(scopeMemoryRows(orgId(LOTUS), "cafe_event_enquiries", enquiries)).toEqual([]);
    expect(scopeMemoryRows(orgId(KALYANI), "cafe_event_enquiries", enquiries)).toEqual([]);
  });

  it("puts the WhatsApp lists under Lotus by default, like the column default", () => {
    const optouts = [{ phone: "9000000001" }, { phone: "9000000002", orgId: KALYANI }, { phone: "9000000003", orgId: "org_unknown" }];
    expect(scopeMemoryRows(orgId(LOTUS), "whatsapp_optouts", optouts).map((r) => r.phone)).toEqual(["9000000001"]);
    expect(scopeMemoryRows(orgId(KALYANI), "whatsapp_unreachable", optouts).map((r) => r.phone)).toEqual(["9000000002"]);
  });

  it("returns copies, and rejects an unknown organization or table", () => {
    const id = orgId(LOTUS);
    const [copy] = scopeMemoryRows(id, "bookings", bookings);
    expect(copy).not.toBe(bookings[0]);
    expect(() => scopeMemoryRows("org_9x4hb7" as OrgId, "bookings", bookings)).toThrow(UnknownOrgError);
    expect(() => scopeMemoryRows(id, "users" as "bookings", bookings)).toThrow(BotSqlError);
    expect(BOT_TABLES).toHaveLength(12);
  });
});
