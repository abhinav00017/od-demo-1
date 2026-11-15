/**
 * Ogi's only way to read an organization's data. Server code only: never import this from a client component.
 *
 * Postgres: every read runs in one read-only transaction that switches to the ogi_bot role and sets the
 * organization for that transaction (app.org_id). Row-level security (lib/bookings/schema.sql) then shows ogi_bot
 * only rows whose org_id is that organization, and ogi_bot has SELECT and nothing else. Without a database, the
 * memory path filters rows by the same rules the database's org_id triggers use, so local dev behaves the same.
 *
 * The organization comes from the server's list (lib/orgs.ts), never from a request body or the model.
 * The SQL text must be a constant written in our code. The model never writes SQL: a role switch only
 * guards against our own query mistakes, because SQL that runs RESET ROLE would leave ogi_bot.
 */
import { neon } from "@neondatabase/serverless";
import { isKnownOrgId, orgForSlug, UnknownOrgError, WHATSAPP_LISTS_ORG_ID, type OrgId } from "@/lib/orgs";

/** Checked again at run time, because a cast can fake the branded type. */
function checked(id: OrgId): OrgId {
  if (!isKnownOrgId(id)) throw new UnknownOrgError();
  return id;
}

/** Every table in schema.sql that holds an organization's rows. Each has org_id and the ogi_bot_read policy. */
export const BOT_TABLES = [
  "bookings",
  "messages",
  "patient_notes",
  "whatsapp_optouts",
  "whatsapp_unreachable",
  "crm_products",
  "crm_leads",
  "crm_quotes",
  "crm_quote_items",
  "crm_followups",
] as const;

export type BotTable = (typeof BOT_TABLES)[number];

/** The read-only database role Ogi reads as. It has no login. */
export const BOT_ROLE = "ogi_bot";

export class BotSqlError extends Error {
  constructor(reason: string) {
    super(`bot query refused: ${reason}`);
    this.name = "BotSqlError";
  }
}

/**
 * One SELECT (or WITH ... SELECT), no semicolon, and nothing that could change the role or the organization.
 * A guard against our own mistakes. The real guard is the role and row-level security.
 */
function assertReadOnlySql(text: string) {
  if (!/^\s*(SELECT|WITH)\b/i.test(text)) throw new BotSqlError("only SELECT");
  if (text.includes(";")) throw new BotSqlError("one statement only");
  if (/\b(set_config|role|reset|set|session_authorization)\b/i.test(text)) throw new BotSqlError("no settings or role changes");
}

export type BotStatement = { text: string; params: unknown[] };

/**
 * The statements one bot read sends, in order, inside one read-only transaction:
 * switch to ogi_bot, set the organization for this transaction only, then the read.
 * Throws before any SQL exists when the organization or the query is not allowed.
 */
export function botStatements(id: OrgId, text: string, params: unknown[] = []): BotStatement[] {
  const org = checked(id);
  assertReadOnlySql(text);
  return [
    { text: `SET LOCAL ROLE ${BOT_ROLE}`, params: [] },
    { text: "SELECT set_config('app.org_id', $1, true)", params: [org] },
    { text, params },
  ];
}

let cached: { url: string; sql: ReturnType<typeof neon> } | undefined;

/**
 * Runs one read for Ogi on Postgres, as ogi_bot, scoped to one organization. Returns the read's rows.
 * Uses the Neon HTTP driver's transaction(): the statements go in one request as one non-interactive
 * transaction, so SET LOCAL and set_config(..., true) end with it.
 */
export async function botQuery<T = Record<string, unknown>>(id: OrgId, text: string, params: unknown[] = []): Promise<T[]> {
  const statements = botStatements(id, text, params);
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("botQuery needs DATABASE_URL. Without a database, use scopeMemoryRows.");
  if (cached?.url !== url) cached = { url, sql: neon(url) };
  const sql = cached.sql;
  const results = await sql.transaction(
    statements.map((s) => sql.query(s.text, s.params)),
    { readOnly: true },
  );
  return results[statements.length - 1] as T[];
}

/** True when bot reads go to Postgres, false when they use the in-memory stores. Same switch as getStore(). */
export function botUsesDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Parent rows a memory read may need: a message's booking or CRM lead, a quote item's quote. */
export type MemoryParents = { bookings?: readonly object[]; crm_leads?: readonly object[]; crm_quotes?: readonly object[] };

type MemoryRow = Record<string, unknown>;

function parentOrg(table: "bookings" | "crm_leads" | "crm_quotes", id: unknown, parents: MemoryParents): string | undefined {
  const parent = parents[table]?.find((p) => (p as MemoryRow).id === id);
  return parent ? memoryOrgOf(table, parent as MemoryRow, parents) : undefined;
}

/**
 * The organization a memory row belongs to, by the same rules as the org_id triggers in schema.sql:
 * a slug table takes the organization with that slug; a quote item takes its quote's; a message takes its CRM
 * lead's, or else its booking's; the WhatsApp lists take their own orgId, or else the column's default.
 * Any orgId on a trigger table's row is ignored, as the triggers ignore what an insert says.
 * Undefined when the database would refuse the row (unknown slug, missing parent), so the row is never shown.
 */
function memoryOrgOf(table: BotTable, row: MemoryRow, parents: MemoryParents): string | undefined {
  switch (table) {
    case "bookings":
    case "patient_notes":
      return orgForSlug(row.clinicSlug)?.id;
    case "crm_products":
    case "crm_leads":
    case "crm_quotes":
    case "crm_followups":
      return orgForSlug(row.shopSlug)?.id;
    case "crm_quote_items":
      return parentOrg("crm_quotes", row.quoteId, parents);
    case "messages": {
      // The CRM's memory messages call the lead leadId; the database column is crm_lead_id.
      const lead = row.crmLeadId ?? row.leadId;
      if (lead != null) return parentOrg("crm_leads", lead, parents);
      if (row.bookingId != null) return parentOrg("bookings", row.bookingId, parents);
      return undefined;
    }
    case "whatsapp_optouts":
    case "whatsapp_unreachable":
      if (row.orgId === undefined) return WHATSAPP_LISTS_ORG_ID;
      return isKnownOrgId(row.orgId) ? row.orgId : undefined;
  }
}

/**
 * The memory-store path of a bot read: only the rows of one organization, the same rows row-level security
 * would show ogi_bot. Messages and quote items need their parent rows in `parents`; without them they are
 * never shown. Copies, so the caller cannot change the store.
 */
export function scopeMemoryRows<T extends object>(id: OrgId, table: BotTable, rows: readonly T[], parents: MemoryParents = {}): T[] {
  const org = checked(id);
  if (!(BOT_TABLES as readonly string[]).includes(table)) throw new BotSqlError("unknown table");
  return rows.filter((row) => memoryOrgOf(table, row as MemoryRow, parents) === org).map((row) => ({ ...row }));
}
