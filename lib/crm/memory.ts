import {
  DuplicateError,
  type CrmMessage,
  type CrmStore,
  type Followup,
  type Lead,
  type Product,
  type Quote,
  type QuoteItem,
  type QuoteWithItems,
} from "./types";
import { quoteNumber } from "./math";

type Data = { products: Product[]; leads: Lead[]; quotes: Quote[]; items: QuoteItem[]; followups: Followup[]; messages: CrmMessage[] };

// Kept on globalThis so every route in one server process shares the same data.
// In `next dev` each route can load its own copy of this module.
const g = globalThis as typeof globalThis & { __crmData?: Data; __crmSeed?: Promise<unknown> };

function data(): Data {
  g.__crmData ??= { products: [], leads: [], quotes: [], items: [], followups: [], messages: [] };
  return g.__crmData;
}

const stamp = () => new Date().toISOString();
const copy = <T extends object>(x: T): T => ({ ...x });
const newestFirst = (a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt);

function withItems(q: Quote): QuoteWithItems {
  const d = data();
  const items = d.items
    .filter((i) => i.quoteId === q.id)
    .sort((a, b) => a.position - b.position)
    .map((i) => {
      const p = d.products.find((x) => x.id === i.productId);
      return {
        ...i,
        product: p
          ? { id: p.id, sku: p.sku, name: p.name, brand: p.brand, category: p.category, sizeMm: p.sizeMm, finish: p.finish, sqftPerBox: p.sqftPerBox, piecesPerBox: p.piecesPerBox, pricePerBox: p.pricePerBox }
          : null,
      };
    });
  return { ...q, items };
}

/** In-memory CRM store for dev and tests. Everything vanishes when the server restarts. */
export const memoryCrmStore: CrmStore = {
  kind: "memory",

  async listProducts(shop) {
    return data()
      .products.filter((p) => p.shopSlug === shop)
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
      .map(copy);
  },

  async createProduct(shop, input) {
    if (data().products.some((p) => p.shopSlug === shop && p.sku.toLowerCase() === input.sku.toLowerCase())) throw new DuplicateError("sku");
    const p: Product = { ...input, id: crypto.randomUUID(), shopSlug: shop, createdAt: stamp() };
    data().products.push(p);
    return copy(p);
  },

  async updateProduct(shop, id, patch) {
    const p = data().products.find((x) => x.shopSlug === shop && x.id === id);
    if (!p) return null;
    if (patch.sku && data().products.some((x) => x.shopSlug === shop && x.id !== id && x.sku.toLowerCase() === patch.sku!.toLowerCase())) {
      throw new DuplicateError("sku");
    }
    Object.assign(p, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)));
    return copy(p);
  },

  async listLeads(shop) {
    return data().leads.filter((l) => l.shopSlug === shop).sort(newestFirst).map(copy);
  },

  async getLead(shop, id) {
    const l = data().leads.find((x) => x.shopSlug === shop && x.id === id);
    return l ? copy(l) : null;
  },

  async createLead(shop, input, at = stamp()) {
    const existing = data().leads.find((l) => l.shopSlug === shop && l.phone === input.phone);
    if (existing) throw new DuplicateError("phone", existing.id);
    const lead: Lead = {
      ...input,
      id: crypto.randomUUID(),
      shopSlug: shop,
      status: "lead",
      nextFollowUpAt: null,
      lastContactAt: at,
      createdAt: at,
      convertedAt: null,
    };
    data().leads.push(lead);
    return copy(lead);
  },

  async updateLead(shop, id, patch) {
    const l = data().leads.find((x) => x.shopSlug === shop && x.id === id);
    if (!l) return null;
    Object.assign(l, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)));
    return copy(l);
  },

  async markCustomer(shop, id, at) {
    const l = data().leads.find((x) => x.shopSlug === shop && x.id === id);
    if (!l) return null;
    l.status = "customer";
    l.convertedAt ??= at;
    return copy(l);
  },

  async touchLead(shop, id, at) {
    const l = data().leads.find((x) => x.shopSlug === shop && x.id === id);
    if (l && at > l.lastContactAt) l.lastContactAt = at;
  },

  async refreshNextFollowUp(shop, leadId) {
    const l = data().leads.find((x) => x.shopSlug === shop && x.id === leadId);
    if (!l) return;
    const open = data()
      .followups.filter((f) => f.shopSlug === shop && f.leadId === leadId && !f.doneAt)
      .map((f) => f.dueAt)
      .sort();
    l.nextFollowUpAt = open[0] ?? null;
  },

  async listQuotes(shop, opts = {}) {
    return data()
      .quotes.filter((q) => q.shopSlug === shop && (!opts.leadId || q.leadId === opts.leadId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.seq - a.seq)
      .map(copy);
  },

  async getQuote(shop, id) {
    const q = data().quotes.find((x) => x.shopSlug === shop && x.id === id);
    return q ? withItems(q) : null;
  },

  async getQuoteByNumber(shop, number) {
    const q = data().quotes.find((x) => x.shopSlug === shop && x.number === number);
    return q ? withItems(q) : null;
  },

  async createQuote(shop, leadId, content, { prefix, publicKey, at = stamp() }) {
    const d = data();
    const seq = Math.max(0, ...d.quotes.filter((q) => q.shopSlug === shop).map((q) => q.seq)) + 1;
    const q: Quote = {
      id: crypto.randomUUID(),
      shopSlug: shop,
      leadId,
      seq,
      number: quoteNumber(prefix, seq),
      publicKey,
      status: "draft",
      subtotal: content.subtotal,
      discount: content.discount,
      total: content.total,
      sentAt: null,
      soldAt: null,
      notes: content.notes,
      createdAt: at,
    };
    d.quotes.push(q);
    content.items.forEach((item, position) => d.items.push({ ...item, id: crypto.randomUUID(), quoteId: q.id, position }));
    return withItems(q);
  },

  async saveQuote(shop, id, content) {
    const d = data();
    const q = d.quotes.find((x) => x.shopSlug === shop && x.id === id);
    if (!q) return null;
    d.items = d.items.filter((i) => i.quoteId !== id);
    content.items.forEach((item, position) => d.items.push({ ...item, id: crypto.randomUUID(), quoteId: id, position }));
    Object.assign(q, { subtotal: content.subtotal, discount: content.discount, total: content.total, notes: content.notes });
    return withItems(q);
  },

  async setQuoteStatus(shop, id, status, at) {
    const q = data().quotes.find((x) => x.shopSlug === shop && x.id === id);
    if (!q) return null;
    q.status = status;
    if (status === "sent") q.sentAt = at;
    if (status === "sold") q.soldAt = at;
    return copy(q);
  },

  async listFollowups(shop, opts = {}) {
    return data()
      .followups.filter((f) => f.shopSlug === shop && (!opts.leadId || f.leadId === opts.leadId) && (opts.open === undefined || !f.doneAt === opts.open))
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
      .map(copy);
  },

  async createFollowup(shop, input) {
    const f: Followup = {
      id: crypto.randomUUID(),
      shopSlug: shop,
      leadId: input.leadId,
      quoteId: input.quoteId ?? null,
      kind: input.kind,
      dueAt: input.dueAt,
      doneAt: input.doneAt ?? null,
      result: input.result ?? null,
      createdAt: stamp(),
    };
    data().followups.push(f);
    return copy(f);
  },

  async updateFollowup(shop, id, patch) {
    const f = data().followups.find((x) => x.shopSlug === shop && x.id === id);
    if (!f) return null;
    Object.assign(f, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)));
    return copy(f);
  },

  async logMessage(input) {
    const now = stamp();
    const m: CrmMessage = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    data().messages.push(m);
    return copy(m);
  },

  async listMessages(shop, opts = {}) {
    const leads = new Set(data().leads.filter((l) => l.shopSlug === shop).map((l) => l.id));
    return data()
      .messages.filter((m) => leads.has(m.leadId) && (!opts.leadId || m.leadId === opts.leadId))
      .sort(newestFirst)
      .map(copy);
  },
};

/**
 * Seeds the memory store once per server process, on the first CRM request. Every caller awaits the same promise.
 * Postgres is seeded by scripts/seed-crm.ts instead.
 */
export function seedMemoryOnce(seed: () => Promise<unknown>) {
  g.__crmSeed ??= seed().catch((err: unknown) => {
    g.__crmSeed = undefined;
    throw err;
  });
  return g.__crmSeed;
}

/** Tests only: empties the store. `seed: true` lets the next request seed it again; the default keeps it empty. */
export function resetMemoryCrmStore({ seed = false }: { seed?: boolean } = {}) {
  g.__crmData = { products: [], leads: [], quotes: [], items: [], followups: [], messages: [] };
  g.__crmSeed = seed ? undefined : Promise.resolve();
}
