/**
 * Demo data for the CRM: a made-up showroom's catalogue, six leads and a few quotes in different states,
 * dated relative to `now` so "Due today" always has something in it. Used by the memory store on its first
 * request and by scripts/seed-crm.ts for Postgres. Safe to run twice: existing SKUs and phone numbers are skipped.
 */
import { boxesForArea, quoteTotals } from "./math";
import type { Shop } from "./shop";
import { addDays } from "./time";
import { DuplicateError, type Category, type CrmStore, type LeadSource, type NewProduct, type PricedItem, type Product, type QuoteStatus } from "./types";

/** Sq ft one box covers: mm x mm x pieces, 92,903.04 mm² to a sq ft, two decimals. */
function sqft(sizeMm: string, pieces: number) {
  const [w, h] = sizeMm.split("x").map(Number);
  return Math.round(((w * h * pieces) / 92903.04) * 100) / 100;
}

type P = [sku: string, name: string, brand: string, category: Category, sizeMm: string, finish: string, rupees: number, pieces: number, active?: boolean];

// Brands are made up, like the shop.
const PRODUCTS: P[] = [
  ["F601", "Carrara Gloss", "Vitrano", "floor", "600x600", "Glossy", 1085, 4],
  ["F602", "Statuario Matt", "Vitrano", "floor", "600x600", "Matt", 1140, 4],
  ["F603", "Ivory Plain", "Duraglaze", "floor", "600x600", "Polished", 820, 4],
  ["F604", "Grey Concrete", "Stonecraft", "floor", "600x600", "Matt", 930, 4],
  ["F605", "Onyx Beige", "Vitrano", "floor", "800x800", "High gloss", 2150, 3],
  ["F606", "Nero Marquina", "Stonecraft", "floor", "800x1600", "Polished", 4690, 2],
  ["F607", "Calacatta Gold", "Vitrano", "floor", "600x1200", "Glossy", 2280, 2],
  ["F608", "Oak Plank", "Terra Nova", "floor", "200x1200", "Wood matt", 1320, 6],
  ["F609", "Walnut Plank", "Terra Nova", "floor", "200x1200", "Wood matt", 1395, 6],
  ["F610", "Sandstone Rustic", "Stonecraft", "floor", "600x600", "Rustic", 990, 4],
  ["W301", "White Satin", "Duraglaze", "wall", "300x450", "Satin", 410, 6],
  ["W302", "Pearl Gloss", "Duraglaze", "wall", "300x600", "Glossy", 560, 6],
  ["W303", "Sage Ripple", "AquaLine", "wall", "300x600", "Matt", 640, 6],
  ["W304", "Terracotta Brick", "Terra Nova", "wall", "300x600", "Textured", 720, 6],
  ["W305", "Marble Highlighter", "Vitrano", "wall", "300x450", "Glossy", 520, 6],
  ["W306", "Blue Mosaic Strip", "AquaLine", "wall", "300x600", "Glossy", 690, 6],
  ["O401", "Parking Grip Grey", "Stonecraft", "outdoor", "400x400", "Anti-skid", 380, 6],
  ["O402", "Parking Grip Red", "Stonecraft", "outdoor", "400x400", "Anti-skid", 380, 6],
  ["O403", "Cool Roof White", "Duraglaze", "outdoor", "300x300", "Heat reflective", 450, 11],
  ["O404", "Slate Paver", "Terra Nova", "outdoor", "600x600", "Structured matt", 1060, 4],
  ["O405", "Pebble Deck", "Stonecraft", "outdoor", "600x600", "Anti-skid", 1010, 4],
  ["B301", "Aqua Matt Floor", "AquaLine", "bathroom", "300x300", "Anti-skid matt", 420, 11],
  ["B302", "Ivory Wall Gloss", "AquaLine", "bathroom", "300x450", "Glossy", 430, 6],
  ["B303", "Charcoal Matt Floor", "AquaLine", "bathroom", "300x300", "Anti-skid matt", 440, 11],
  ["B304", "Marble Look Wall", "Vitrano", "bathroom", "300x600", "Glossy", 610, 6],
  ["B305", "Seafoam Highlighter", "AquaLine", "bathroom", "300x450", "Glossy", 470, 6],
  ["K301", "Subway White", "Duraglaze", "kitchen", "75x300", "Glossy", 690, 44],
  ["K302", "Subway Sage", "Duraglaze", "kitchen", "75x300", "Glossy", 720, 44],
  ["K303", "Herringbone Cream", "Terra Nova", "kitchen", "300x600", "Matt", 650, 6],
  ["K304", "Moroccan Pattern", "Terra Nova", "kitchen", "250x375", "Matt", 580, 10],
  ["K305", "Old Rose Gloss", "Duraglaze", "kitchen", "300x450", "Glossy", 495, 6, false],
];

export function seedProducts(prefix: string): NewProduct[] {
  return PRODUCTS.map(([sku, name, brand, category, sizeMm, finish, rupees, pieces, active = true]) => ({
    sku: `${prefix}-${sku}`,
    name,
    brand,
    category,
    sizeMm,
    finish,
    pricePerBox: rupees * 100,
    sqftPerBox: sqft(sizeMm, pieces),
    piecesPerBox: pieces,
    imageUrl: null,
    active,
  }));
}

/** A quote line in the seed: a SKU suffix and either boxes or a room area (10% wastage). */
type SeedLine = { sku: string; boxes?: number; area?: number };
type SeedQuote = { daysAgo: number; status: QuoteStatus; lines: SeedLine[]; discountRupees?: number; notes?: string; statusDaysAgo?: number };
type SeedLead = {
  name: string;
  phone: string;
  source: LeadSource;
  notes: string;
  daysAgo: number;
  lost?: boolean;
  quotes: SeedQuote[];
  /** Follow-ups: due N days from now (negative = overdue); done ones are already handled. */
  followups?: { kind: "call" | "auto_whatsapp"; dueInDays: number; done?: boolean; result?: string }[];
  /** Days since the shop last spoke to them. Default: the newest of created and quote status changes. */
  lastContactDaysAgo?: number;
};

/**
 * Made-up customers with made-up numbers. These numbers never reach a WhatsApp provider: lib/crm/notify.ts sends
 * anything for them through the fake sender, so the live demo cannot message a stranger.
 */
const LEADS: SeedLead[] = [
  {
    name: "Ravi Teja Varma",
    phone: "9000000101",
    source: "walk-in",
    notes: "New flat in Seethammadhara. Living and dining floor, likes light marble looks.",
    daysAgo: 9,
    lastContactDaysAgo: 4,
    quotes: [{ daysAgo: 5, status: "sent", statusDaysAgo: 4, lines: [{ sku: "F601", area: 420 }, { sku: "F602", area: 140 }], discountRupees: 1500 }],
    followups: [{ kind: "call", dueInDays: 0 }],
  },
  {
    name: "Lakshmi Prasanna",
    phone: "9000000102",
    source: "call",
    notes: "Two bathrooms. Wants anti-skid floor and a highlighter strip.",
    daysAgo: 2,
    quotes: [{ daysAgo: 1, status: "draft", lines: [{ sku: "B301", area: 80 }, { sku: "B304", area: 210 }, { sku: "B305", boxes: 4 }] }],
  },
  {
    name: "Suresh Naidu",
    phone: "9000000103",
    source: "referral",
    notes: "Builder friend of the owner. Parking and terrace for an independent house.",
    daysAgo: 20,
    quotes: [
      { daysAgo: 16, status: "sold", statusDaysAgo: 3, lines: [{ sku: "O401", area: 600 }, { sku: "O403", area: 900 }], discountRupees: 2000, notes: "Delivery to Pendurthi site." },
    ],
  },
  {
    name: "Fathima Begum",
    phone: "9000000104",
    source: "whatsapp",
    notes: "Kitchen backsplash and wall. Sent photos of the kitchen on WhatsApp.",
    daysAgo: 6,
    lastContactDaysAgo: 3,
    quotes: [{ daysAgo: 4, status: "sent", statusDaysAgo: 3, lines: [{ sku: "K301", area: 45 }, { sku: "K303", boxes: 6 }] }],
    followups: [
      { kind: "auto_whatsapp", dueInDays: -1, done: true, result: "sent" },
      { kind: "call", dueInDays: -1 },
    ],
  },
  {
    name: "Kiran Kumar Reddy",
    phone: "9000000105",
    source: "walk-in",
    notes: "Compared prices with two other shops.",
    daysAgo: 15,
    lost: true,
    quotes: [{ daysAgo: 14, status: "lost", statusDaysAgo: 8, lines: [{ sku: "F606", area: 300 }] }],
  },
  {
    name: "Anjali Mehta",
    phone: "9000000106",
    source: "walk-in",
    notes: "Bedroom floors, wood look. Coming back with her husband.",
    daysAgo: 0,
    quotes: [],
    followups: [{ kind: "call", dueInDays: 2 }],
  },
];

/** The demo numbers above. Sends to them never leave the server. */
export const SEED_PHONES: ReadonlySet<string> = new Set(LEADS.map((l) => l.phone));

/** Random key for a quote's public link. Works in Node and the browser. */
export function newPublicKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Prices seed lines from the catalogue, the same way the API prices a quote. */
function priceLines(lines: SeedLine[], bySku: Map<string, Product>, prefix: string): PricedItem[] {
  return lines.map((line) => {
    const p = bySku.get(`${prefix}-${line.sku}`);
    if (!p) throw new Error(`seed: no product ${line.sku}`);
    const qtyBoxes = line.area ? boxesForArea(line.area, 10, p.sqftPerBox) : line.boxes!;
    return { productId: p.id, qtyBoxes, areaSqft: line.area ?? null, wastagePct: 10, unitPrice: p.pricePerBox, lineTotal: qtyBoxes * p.pricePerBox };
  });
}

/** Seeds one shop. Returns how many products and leads it added. */
export async function seedCrm(store: CrmStore, shop: Shop, now: Date = new Date()) {
  const ago = (days: number, hours = 0) => new Date(addDays(now, -days).getTime() - hours * 3_600_000).toISOString();
  let products = 0;
  let leads = 0;

  const existing = new Set((await store.listProducts(shop.slug)).map((p) => p.sku));
  for (const p of seedProducts(shop.prefix)) {
    if (existing.has(p.sku)) continue;
    try {
      await store.createProduct(shop.slug, p);
      products += 1;
    } catch (err) {
      if (!(err instanceof DuplicateError)) throw err;
    }
  }
  const bySku = new Map((await store.listProducts(shop.slug)).map((p) => [p.sku, p]));

  for (const l of LEADS) {
    let lead;
    try {
      // Anjali walked in two hours ago, so she counts as this week's newest lead on any day.
      lead = await store.createLead(shop.slug, { name: l.name, phone: l.phone, source: l.source, notes: l.notes }, ago(l.daysAgo, l.daysAgo === 0 ? 2 : 0));
    } catch (err) {
      // Already seeded: leave this lead and its quotes alone.
      if (err instanceof DuplicateError) continue;
      throw err;
    }
    leads += 1;
    for (const q of l.quotes) {
      const items = priceLines(q.lines, bySku, shop.prefix);
      const totals = quoteTotals(
        items.map((i) => i.lineTotal),
        (q.discountRupees ?? 0) * 100,
      );
      const quote = await store.createQuote(shop.slug, lead.id, { items, ...totals, notes: q.notes ?? "" }, { prefix: shop.prefix, publicKey: newPublicKey(), at: ago(q.daysAgo) });
      if (q.status !== "draft") {
        // A sold or lost quote was sent first.
        await store.setQuoteStatus(shop.slug, quote.id, "sent", ago(q.statusDaysAgo ?? q.daysAgo));
        if (q.status !== "sent") await store.setQuoteStatus(shop.slug, quote.id, q.status, ago(q.statusDaysAgo ?? q.daysAgo));
      }
      if (q.status === "sold") await store.markCustomer(shop.slug, lead.id, ago(q.statusDaysAgo ?? q.daysAgo));
    }
    if (l.lost) await store.updateLead(shop.slug, lead.id, { status: "lost" });
    for (const f of l.followups ?? []) {
      const due = addDays(now, f.dueInDays).toISOString();
      await store.createFollowup(shop.slug, { leadId: lead.id, kind: f.kind, dueAt: due, doneAt: f.done ? due : null, result: f.result ?? null });
    }
    const lastContact = l.lastContactDaysAgo ?? Math.min(l.daysAgo, ...l.quotes.map((q) => q.statusDaysAgo ?? q.daysAgo));
    await store.touchLead(shop.slug, lead.id, ago(lastContact, l.daysAgo === 0 ? 2 : 0));
    await store.refreshNextFollowUp(shop.slug, lead.id);
  }
  return { products, leads };
}
