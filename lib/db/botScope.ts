/**
 * Ogi's only way to read business data. Server code only: never import this from a client component.
 *
 * Postgres: every read runs in one read-only transaction that switches to the ogi_bot role and sets the
 * business for that transaction. Row-level security (lib/bookings/schema.sql) then shows ogi_bot only that
 * business's rows, and ogi_bot has SELECT and nothing else. Without a database, the memory path filters rows
 * by the same rule, so local dev behaves the same.
 *
 * The business comes from the server-side allow-list below, never from a request body or the model.
 * The SQL text must be a constant written in our code. The model never writes SQL: a role switch only
 * guards against our own query mistakes, because SQL that runs RESET ROLE would leave ogi_bot.
 */
import { neon } from "@neondatabase/serverless";

/** Every business Ogi may read for. Add a business here only with its rows in the database. */
export const BUSINESS_IDS = ["lotus-clinic", "kalyani-tiles"] as const;

type KnownBusiness = (typeof BUSINESS_IDS)[number];
declare const businessBrand: unique symbol;
/** A business id from the allow-list. Make one only with businessId(). */
export type BusinessId = KnownBusiness & { readonly [businessBrand]: true };

export class UnknownBusinessError extends Error {
  constructor() {
    // The raw value stays out of the message, so a hostile string never reaches logs.
    super("unknown business id");
    this.name = "UnknownBusinessError";
  }
}

const isKnown = (raw: unknown): raw is KnownBusiness => typeof raw === "string" && (BUSINESS_IDS as readonly string[]).includes(raw);

/** The one way to make a BusinessId. Throws UnknownBusinessError for anything outside the allow-list. */
export function businessId(raw: unknown): BusinessId {
  if (!isKnown(raw)) throw new UnknownBusinessError();
  return raw as BusinessId;
}

/** Checked again at run time, because a cast can fake the branded type. */
function checked(id: BusinessId): KnownBusiness {
  if (!isKnown(id)) throw new UnknownBusinessError();
  return id;
}

/** Every table in schema.sql, with the business its business_id column defaults to. */
export const BOT_TABLES = {
  bookings: "lotus-clinic",
  messages: "lotus-clinic",
  patient_notes: "lotus-clinic",
  whatsapp_optouts: "lotus-clinic",
  whatsapp_unreachable: "lotus-clinic",
  crm_products: "kalyani-tiles",
  crm_leads: "kalyani-tiles",
  crm_quotes: "kalyani-tiles",
  crm_quote_items: "kalyani-tiles",
  crm_followups: "kalyani-tiles",
} as const satisfies Record<string, KnownBusiness>;

export type BotTable = keyof typeof BOT_TABLES;

/** The read-only database role Ogi reads as. It has no login. */
export const BOT_ROLE = "ogi_bot";

export class BotSqlError extends Error {
  constructor(reason: string) {
    super(`bot query refused: ${reason}`);
    this.name = "BotSqlError";
  }
}

/**
 * One SELECT (or WITH ... SELECT), no semicolon, and nothing that could change the role or the business.
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
 * switch to ogi_bot, set the business for this transaction only, then the read.
 * Throws before any SQL exists when the business or the query is not allowed.
 */
export function botStatements(id: BusinessId, text: string, params: unknown[] = []): BotStatement[] {
  const business = checked(id);
  assertReadOnlySql(text);
  return [
    { text: `SET LOCAL ROLE ${BOT_ROLE}`, params: [] },
    { text: "SELECT set_config('app.business_id', $1, true)", params: [business] },
    { text, params },
  ];
}

let cached: { url: string; sql: ReturnType<typeof neon> } | undefined;

/**
 * Runs one read for Ogi on Postgres, as ogi_bot, scoped to one business. Returns the read's rows.
 * Uses the Neon HTTP driver's transaction(): the statements go in one request as one non-interactive
 * transaction, so SET LOCAL and set_config(..., true) end with it.
 */
export async function botQuery<T = Record<string, unknown>>(id: BusinessId, text: string, params: unknown[] = []): Promise<T[]> {
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

type MemoryRow = { businessId?: unknown; crmLeadId?: unknown; leadId?: unknown };

/**
 * The business a memory row belongs to, by the database's rule: its own businessId when it has one,
 * otherwise the table's default. A message linked to a CRM lead belongs to the CRM business, as the
 * messages trigger does in the database.
 */
function memoryBusinessOf(table: BotTable, row: MemoryRow): string {
  if (typeof row.businessId === "string") return row.businessId;
  if (table === "messages" && (row.crmLeadId != null || row.leadId != null)) return BOT_TABLES.crm_leads;
  return BOT_TABLES[table];
}

/**
 * The memory-store path of a bot read: only the rows of one business, the same rows row-level security
 * would show ogi_bot. Copies, so the caller cannot change the store.
 */
export function scopeMemoryRows<T extends object>(id: BusinessId, table: BotTable, rows: readonly T[]): T[] {
  const business = checked(id);
  if (!Object.hasOwn(BOT_TABLES, table)) throw new BotSqlError("unknown table");
  return rows.filter((row) => memoryBusinessOf(table, row as MemoryRow) === business).map((row) => ({ ...row }));
}
