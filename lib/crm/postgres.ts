import { neon } from "@neondatabase/serverless";
import {
  DuplicateError,
  type Category,
  type CrmMessage,
  type CrmMessageKind,
  type CrmMessageStatus,
  type CrmStore,
  type Followup,
  type FollowupKind,
  type Lead,
  type LeadSource,
  type LeadStatus,
  type Product,
  type Quote,
  type QuoteContent,
  type QuoteItemWithProduct,
  type QuoteStatus,
  type QuoteWithItems,
} from "./types";

type Stamp = Date | string;
const iso = (v: Stamp) => new Date(v).toISOString();
const isoOrNull = (v: Stamp | null) => (v === null ? null : iso(v));
// Neon returns bigint and numeric as strings.
const num = (v: number | string) => Number(v);

const PRODUCT_COLUMNS = `id, shop_slug, sku, name, brand, category, size_mm, finish, price_per_box, sqft_per_box, pieces_per_box, image_url, active, created_at`;
type ProductRow = {
  id: string;
  shop_slug: string;
  sku: string;
  name: string;
  brand: string;
  category: Category;
  size_mm: string;
  finish: string;
  price_per_box: number | string;
  sqft_per_box: number | string;
  pieces_per_box: number | string;
  image_url: string | null;
  active: boolean;
  created_at: Stamp;
};
const toProduct = (r: ProductRow): Product => ({
  id: r.id,
  shopSlug: r.shop_slug,
  sku: r.sku,
  name: r.name,
  brand: r.brand,
  category: r.category,
  sizeMm: r.size_mm,
  finish: r.finish,
  pricePerBox: num(r.price_per_box),
  sqftPerBox: num(r.sqft_per_box),
  piecesPerBox: num(r.pieces_per_box),
  imageUrl: r.image_url,
  active: r.active,
  createdAt: iso(r.created_at),
});

const LEAD_COLUMNS = `id, shop_slug, name, phone, status, source, notes, next_follow_up_at, last_contact_at, created_at, converted_at`;
type LeadRow = {
  id: string;
  shop_slug: string;
  name: string;
  phone: string;
  status: LeadStatus;
  source: LeadSource;
  notes: string;
  next_follow_up_at: Stamp | null;
  last_contact_at: Stamp;
  created_at: Stamp;
  converted_at: Stamp | null;
};
const toLead = (r: LeadRow): Lead => ({
  id: r.id,
  shopSlug: r.shop_slug,
  name: r.name,
  phone: r.phone,
  status: r.status,
  source: r.source,
  notes: r.notes,
  nextFollowUpAt: isoOrNull(r.next_follow_up_at),
  lastContactAt: iso(r.last_contact_at),
  createdAt: iso(r.created_at),
  convertedAt: isoOrNull(r.converted_at),
});

const QUOTE_COLUMNS = `id, shop_slug, lead_id, seq, number, public_key, status, subtotal, discount, total, sent_at, sold_at, notes, created_at`;
type QuoteRow = {
  id: string;
  shop_slug: string;
  lead_id: string;
  seq: number | string;
  number: string;
  public_key: string;
  status: QuoteStatus;
  subtotal: number | string;
  discount: number | string;
  total: number | string;
  sent_at: Stamp | null;
  sold_at: Stamp | null;
  notes: string;
  created_at: Stamp;
};
const toQuote = (r: QuoteRow): Quote => ({
  id: r.id,
  shopSlug: r.shop_slug,
  leadId: r.lead_id,
  seq: num(r.seq),
  number: r.number,
  publicKey: r.public_key,
  status: r.status,
  subtotal: num(r.subtotal),
  discount: num(r.discount),
  total: num(r.total),
  sentAt: isoOrNull(r.sent_at),
  soldAt: isoOrNull(r.sold_at),
  notes: r.notes,
  createdAt: iso(r.created_at),
});

// Items with the product fields a quote line shows, one query.
const ITEM_SELECT = `SELECT i.id, i.quote_id, i.product_id, i.position, i.qty_boxes, i.area_sqft, i.wastage_pct, i.unit_price, i.line_total,
  p.sku, p.name, p.brand, p.category, p.size_mm, p.finish, p.sqft_per_box, p.pieces_per_box, p.price_per_box
  FROM crm_quote_items i LEFT JOIN crm_products p ON p.id = i.product_id`;
type ItemRow = {
  id: string;
  quote_id: string;
  product_id: string;
  position: number | string;
  qty_boxes: number | string;
  area_sqft: number | string | null;
  wastage_pct: number | string;
  unit_price: number | string;
  line_total: number | string;
  sku: string | null;
  name: string | null;
  brand: string | null;
  category: Category | null;
  size_mm: string | null;
  finish: string | null;
  sqft_per_box: number | string | null;
  pieces_per_box: number | string | null;
  price_per_box: number | string | null;
};
const toItem = (r: ItemRow): QuoteItemWithProduct => ({
  id: r.id,
  quoteId: r.quote_id,
  productId: r.product_id,
  position: num(r.position),
  qtyBoxes: num(r.qty_boxes),
  areaSqft: r.area_sqft === null ? null : num(r.area_sqft),
  wastagePct: num(r.wastage_pct),
  unitPrice: num(r.unit_price),
  lineTotal: num(r.line_total),
  product:
    r.name === null
      ? null
      : {
          id: r.product_id,
          sku: r.sku!,
          name: r.name,
          brand: r.brand!,
          category: r.category!,
          sizeMm: r.size_mm!,
          finish: r.finish!,
          sqftPerBox: num(r.sqft_per_box!),
          piecesPerBox: num(r.pieces_per_box!),
          pricePerBox: num(r.price_per_box!),
        },
});

const FOLLOWUP_COLUMNS = `id, shop_slug, lead_id, quote_id, kind, due_at, done_at, result, created_at`;
type FollowupRow = {
  id: string;
  shop_slug: string;
  lead_id: string;
  quote_id: string | null;
  kind: FollowupKind;
  due_at: Stamp;
  done_at: Stamp | null;
  result: string | null;
  created_at: Stamp;
};
const toFollowup = (r: FollowupRow): Followup => ({
  id: r.id,
  shopSlug: r.shop_slug,
  leadId: r.lead_id,
  quoteId: r.quote_id,
  kind: r.kind,
  dueAt: iso(r.due_at),
  doneAt: isoOrNull(r.done_at),
  result: r.result,
  createdAt: iso(r.created_at),
});

const MESSAGE_COLUMNS = `id, crm_lead_id, crm_quote_id, kind, provider, to_masked, template, provider_message_id, status, error, created_at, updated_at`;
type MessageRow = {
  id: string;
  crm_lead_id: string;
  crm_quote_id: string | null;
  kind: CrmMessageKind;
  provider: CrmMessage["provider"];
  to_masked: string;
  template: string;
  provider_message_id: string | null;
  status: CrmMessageStatus;
  error: string | null;
  created_at: Stamp;
  updated_at: Stamp;
};
const toMessage = (r: MessageRow): CrmMessage => ({
  id: r.id,
  leadId: r.crm_lead_id,
  quoteId: r.crm_quote_id,
  kind: r.kind,
  provider: r.provider,
  toMasked: r.to_masked,
  template: r.template,
  providerMessageId: r.provider_message_id,
  status: r.status,
  error: r.error,
  createdAt: iso(r.created_at),
  updatedAt: iso(r.updated_at),
});

/** Postgres's unique_violation, and which constraint fired. */
function uniqueViolation(err: unknown): string | null {
  const e = err as { code?: string; constraint?: string; message?: string } | null;
  if (e?.code !== "23505") return null;
  return e.constraint ?? e.message ?? "";
}

/** Item arrays for unnest(): one array per column, in line order. */
function itemArrays(content: QuoteContent) {
  return [
    content.items.map((i) => i.productId),
    content.items.map((i) => i.qtyBoxes),
    content.items.map((i) => i.areaSqft),
    content.items.map((i) => i.wastagePct),
    content.items.map((i) => i.unitPrice),
    content.items.map((i) => i.lineTotal),
    content.items.map((_, n) => n),
  ];
}

const UNNEST_ITEMS = `unnest($ITEMS0::uuid[], $ITEMS1::int[], $ITEMS2::numeric[], $ITEMS3::numeric[], $ITEMS4::bigint[], $ITEMS5::bigint[], $ITEMS6::int[])
  AS t(product_id, qty_boxes, area_sqft, wastage_pct, unit_price, line_total, position)`;

/** Numbers the $ITEMSn placeholders from `first`. */
const unnestFrom = (first: number) => UNNEST_ITEMS.replace(/\$ITEMS(\d)/g, (_, n: string) => `$${first + Number(n)}`);

/** Postgres CRM store over Neon's HTTP driver. Plain SQL with $n parameters, no ORM. Every query is scoped by shop_slug. */
export function postgresCrmStore(databaseUrl: string): CrmStore {
  const sql = neon(databaseUrl);
  const run = async <T>(text: string, params: unknown[] = []) => (await sql.query(text, params)) as T[];

  async function quoteWithItems(row: QuoteRow | undefined): Promise<QuoteWithItems | null> {
    if (!row) return null;
    const items = await run<ItemRow>(`${ITEM_SELECT} WHERE i.quote_id = $1::uuid ORDER BY i.position`, [row.id]);
    return { ...toQuote(row), items: items.map(toItem) };
  }

  return {
    kind: "postgres",

    async listProducts(shop) {
      const rows = await run<ProductRow>(`SELECT ${PRODUCT_COLUMNS} FROM crm_products WHERE shop_slug = $1 ORDER BY category, name LIMIT 1000`, [shop]);
      return rows.map(toProduct);
    },

    async createProduct(shop, p) {
      try {
        const [row] = await run<ProductRow>(
          `INSERT INTO crm_products (shop_slug, sku, name, brand, category, size_mm, finish, price_per_box, sqft_per_box, pieces_per_box, image_url, active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           RETURNING ${PRODUCT_COLUMNS}`,
          [shop, p.sku, p.name, p.brand, p.category, p.sizeMm, p.finish, p.pricePerBox, p.sqftPerBox, p.piecesPerBox, p.imageUrl, p.active],
        );
        return toProduct(row);
      } catch (err) {
        if (uniqueViolation(err) !== null) throw new DuplicateError("sku");
        throw err;
      }
    },

    async updateProduct(shop, id, p) {
      try {
        const [row] = await run<ProductRow>(
          `UPDATE crm_products SET
             sku = COALESCE($3, sku), name = COALESCE($4, name), brand = COALESCE($5, brand), category = COALESCE($6, category),
             size_mm = COALESCE($7, size_mm), finish = COALESCE($8, finish), price_per_box = COALESCE($9, price_per_box),
             sqft_per_box = COALESCE($10, sqft_per_box), pieces_per_box = COALESCE($11, pieces_per_box),
             image_url = CASE WHEN $12::boolean THEN $13 ELSE image_url END, active = COALESCE($14, active)
           WHERE shop_slug = $1 AND id = $2::uuid
           RETURNING ${PRODUCT_COLUMNS}`,
          [
            shop,
            id,
            p.sku ?? null,
            p.name ?? null,
            p.brand ?? null,
            p.category ?? null,
            p.sizeMm ?? null,
            p.finish ?? null,
            p.pricePerBox ?? null,
            p.sqftPerBox ?? null,
            p.piecesPerBox ?? null,
            p.imageUrl !== undefined,
            p.imageUrl ?? null,
            p.active ?? null,
          ],
        );
        return row ? toProduct(row) : null;
      } catch (err) {
        if (uniqueViolation(err) !== null) throw new DuplicateError("sku");
        throw err;
      }
    },

    async listLeads(shop) {
      const rows = await run<LeadRow>(`SELECT ${LEAD_COLUMNS} FROM crm_leads WHERE shop_slug = $1 ORDER BY created_at DESC LIMIT 1000`, [shop]);
      return rows.map(toLead);
    },

    async getLead(shop, id) {
      const [row] = await run<LeadRow>(`SELECT ${LEAD_COLUMNS} FROM crm_leads WHERE shop_slug = $1 AND id = $2::uuid`, [shop, id]);
      return row ? toLead(row) : null;
    },

    async createLead(shop, input, at = new Date().toISOString()) {
      // ON CONFLICT DO NOTHING returns no row for a duplicate number. Then the existing lead's id goes back to the caller.
      const [row] = await run<LeadRow>(
        `INSERT INTO crm_leads (shop_slug, name, phone, source, notes, last_contact_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $6::timestamptz)
         ON CONFLICT (shop_slug, phone) DO NOTHING
         RETURNING ${LEAD_COLUMNS}`,
        [shop, input.name, input.phone, input.source, input.notes, at],
      );
      if (row) return toLead(row);
      const [existing] = await run<{ id: string }>(`SELECT id FROM crm_leads WHERE shop_slug = $1 AND phone = $2`, [shop, input.phone]);
      throw new DuplicateError("phone", existing?.id);
    },

    async updateLead(shop, id, patch) {
      const [row] = await run<LeadRow>(
        `UPDATE crm_leads SET name = COALESCE($3, name), source = COALESCE($4, source), notes = COALESCE($5, notes), status = COALESCE($6, status)
         WHERE shop_slug = $1 AND id = $2::uuid
         RETURNING ${LEAD_COLUMNS}`,
        [shop, id, patch.name ?? null, patch.source ?? null, patch.notes ?? null, patch.status ?? null],
      );
      return row ? toLead(row) : null;
    },

    async markCustomer(shop, id, at) {
      const [row] = await run<LeadRow>(
        `UPDATE crm_leads SET status = 'customer', converted_at = COALESCE(converted_at, $3::timestamptz)
         WHERE shop_slug = $1 AND id = $2::uuid
         RETURNING ${LEAD_COLUMNS}`,
        [shop, id, at],
      );
      return row ? toLead(row) : null;
    },

    async touchLead(shop, id, at) {
      await run(`UPDATE crm_leads SET last_contact_at = GREATEST(last_contact_at, $3::timestamptz) WHERE shop_slug = $1 AND id = $2::uuid`, [shop, id, at]);
    },

    async refreshNextFollowUp(shop, leadId) {
      await run(
        `UPDATE crm_leads SET next_follow_up_at = (SELECT min(due_at) FROM crm_followups WHERE lead_id = $2::uuid AND done_at IS NULL)
         WHERE shop_slug = $1 AND id = $2::uuid`,
        [shop, leadId],
      );
    },

    async listQuotes(shop, opts = {}) {
      const rows = opts.leadId
        ? await run<QuoteRow>(`SELECT ${QUOTE_COLUMNS} FROM crm_quotes WHERE shop_slug = $1 AND lead_id = $2::uuid ORDER BY created_at DESC, seq DESC`, [shop, opts.leadId])
        : await run<QuoteRow>(`SELECT ${QUOTE_COLUMNS} FROM crm_quotes WHERE shop_slug = $1 ORDER BY created_at DESC, seq DESC LIMIT 2000`, [shop]);
      return rows.map(toQuote);
    },

    async getQuote(shop, id) {
      const [row] = await run<QuoteRow>(`SELECT ${QUOTE_COLUMNS} FROM crm_quotes WHERE shop_slug = $1 AND id = $2::uuid`, [shop, id]);
      return quoteWithItems(row);
    },

    async getQuoteByNumber(shop, number) {
      const [row] = await run<QuoteRow>(`SELECT ${QUOTE_COLUMNS} FROM crm_quotes WHERE shop_slug = $1 AND number = $2`, [shop, number]);
      return quoteWithItems(row);
    },

    async createQuote(shop, leadId, content, { prefix, publicKey, at = new Date().toISOString() }) {
      // One statement: the next number for the shop, the quote, and its items. Two staff saving at once can pick the
      // same number; the unique (shop_slug, seq) index refuses the second, and it tries again.
      for (let attempt = 0; ; attempt++) {
        try {
          const [row] = await run<QuoteRow>(
            `WITH next AS (SELECT COALESCE(max(seq), 0) + 1 AS seq FROM crm_quotes WHERE shop_slug = $1),
             q AS (
               INSERT INTO crm_quotes (shop_slug, lead_id, seq, number, public_key, subtotal, discount, total, notes, created_at)
               SELECT $1, $2::uuid, next.seq, $3::text || '-' || lpad(next.seq::text, 4, '0'), $4, $5, $6, $7, $8, $9::timestamptz FROM next
               RETURNING ${QUOTE_COLUMNS}
             ),
             items AS (
               INSERT INTO crm_quote_items (quote_id, product_id, qty_boxes, area_sqft, wastage_pct, unit_price, line_total, position)
               SELECT q.id, t.product_id, t.qty_boxes, t.area_sqft, t.wastage_pct, t.unit_price, t.line_total, t.position
               FROM q, ${unnestFrom(10)}
             )
             SELECT * FROM q`,
            [shop, leadId, prefix, publicKey, content.subtotal, content.discount, content.total, content.notes, at, ...itemArrays(content)],
          );
          return (await quoteWithItems(row))!;
        } catch (err) {
          if (uniqueViolation(err) !== null && attempt < 2) continue;
          throw err;
        }
      }
    },

    async saveQuote(shop, id, content) {
      // One statement, so the old items go and the new ones land together.
      const [row] = await run<QuoteRow>(
        `WITH q AS (
           UPDATE crm_quotes SET subtotal = $3, discount = $4, total = $5, notes = $6
           WHERE shop_slug = $1 AND id = $2::uuid
           RETURNING ${QUOTE_COLUMNS}
         ),
         gone AS (DELETE FROM crm_quote_items WHERE quote_id IN (SELECT id FROM q)),
         items AS (
           INSERT INTO crm_quote_items (quote_id, product_id, qty_boxes, area_sqft, wastage_pct, unit_price, line_total, position)
           SELECT q.id, t.product_id, t.qty_boxes, t.area_sqft, t.wastage_pct, t.unit_price, t.line_total, t.position
           FROM q, ${unnestFrom(7)}
         )
         SELECT * FROM q`,
        [shop, id, content.subtotal, content.discount, content.total, content.notes, ...itemArrays(content)],
      );
      return quoteWithItems(row);
    },

    async setQuoteStatus(shop, id, status, at) {
      const [row] = await run<QuoteRow>(
        `UPDATE crm_quotes SET status = $3,
           sent_at = CASE WHEN $3 = 'sent' THEN $4::timestamptz ELSE sent_at END,
           sold_at = CASE WHEN $3 = 'sold' THEN $4::timestamptz ELSE sold_at END
         WHERE shop_slug = $1 AND id = $2::uuid
         RETURNING ${QUOTE_COLUMNS}`,
        [shop, id, status, at],
      );
      return row ? toQuote(row) : null;
    },

    async listFollowups(shop, opts = {}) {
      const where = ["shop_slug = $1"];
      const params: unknown[] = [shop];
      if (opts.leadId) {
        params.push(opts.leadId);
        where.push(`lead_id = $${params.length}::uuid`);
      }
      if (opts.open !== undefined) where.push(opts.open ? "done_at IS NULL" : "done_at IS NOT NULL");
      const rows = await run<FollowupRow>(`SELECT ${FOLLOWUP_COLUMNS} FROM crm_followups WHERE ${where.join(" AND ")} ORDER BY due_at LIMIT 2000`, params);
      return rows.map(toFollowup);
    },

    async createFollowup(shop, f) {
      const [row] = await run<FollowupRow>(
        `INSERT INTO crm_followups (shop_slug, lead_id, quote_id, kind, due_at, done_at, result)
         VALUES ($1, $2::uuid, $3::uuid, $4, $5::timestamptz, $6::timestamptz, $7)
         RETURNING ${FOLLOWUP_COLUMNS}`,
        [shop, f.leadId, f.quoteId ?? null, f.kind, f.dueAt, f.doneAt ?? null, f.result ?? null],
      );
      return toFollowup(row);
    },

    async updateFollowup(shop, id, patch) {
      const [row] = await run<FollowupRow>(
        `UPDATE crm_followups SET due_at = COALESCE($3::timestamptz, due_at), done_at = COALESCE($4::timestamptz, done_at), result = COALESCE($5, result)
         WHERE shop_slug = $1 AND id = $2::uuid
         RETURNING ${FOLLOWUP_COLUMNS}`,
        [shop, id, patch.dueAt ?? null, patch.doneAt ?? null, patch.result ?? null],
      );
      return row ? toFollowup(row) : null;
    },

    async logMessage(m) {
      const [row] = await run<MessageRow>(
        `INSERT INTO messages (crm_lead_id, crm_quote_id, kind, channel, provider, to_masked, template, provider_message_id, status, error)
         VALUES ($1::uuid, $2::uuid, $3, 'whatsapp', $4, $5, $6, $7, $8, $9)
         RETURNING ${MESSAGE_COLUMNS}`,
        [m.leadId, m.quoteId, m.kind, m.provider, m.toMasked, m.template, m.providerMessageId, m.status, m.error],
      );
      return toMessage(row);
    },

    async listMessages(shop, opts = {}) {
      const rows = opts.leadId
        ? await run<MessageRow>(
            `SELECT m.${MESSAGE_COLUMNS.split(", ").join(", m.")} FROM messages m JOIN crm_leads l ON l.id = m.crm_lead_id
             WHERE l.shop_slug = $1 AND m.crm_lead_id = $2::uuid ORDER BY m.created_at DESC LIMIT 200`,
            [shop, opts.leadId],
          )
        : await run<MessageRow>(
            `SELECT m.${MESSAGE_COLUMNS.split(", ").join(", m.")} FROM messages m JOIN crm_leads l ON l.id = m.crm_lead_id
             WHERE l.shop_slug = $1 ORDER BY m.created_at DESC LIMIT 500`,
            [shop],
          );
      return rows.map(toMessage);
    },
  };
}

