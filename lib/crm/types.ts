/**
 * CRM for tile showrooms: the shapes the store, the API and the screens share.
 * Money is always paise (integer). Timestamps are ISO strings.
 */

export const CATEGORIES = ["floor", "wall", "outdoor", "bathroom", "kitchen"] as const;
export type Category = (typeof CATEGORIES)[number];

export const LEAD_STATUSES = ["lead", "customer", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = ["walk-in", "call", "whatsapp", "referral"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const QUOTE_STATUSES = ["draft", "sent", "sold", "lost"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const FOLLOWUP_KINDS = ["auto_whatsapp", "call"] as const;
export type FollowupKind = (typeof FOLLOWUP_KINDS)[number];

export const CRM_MESSAGE_KINDS = ["quote_sent", "crm_reminder"] as const;
export type CrmMessageKind = (typeof CRM_MESSAGE_KINDS)[number];

export type Product = {
  id: string;
  shopSlug: string;
  sku: string;
  name: string;
  brand: string;
  category: Category;
  /** Like "600x600". */
  sizeMm: string;
  finish: string;
  /** Paise. */
  pricePerBox: number;
  sqftPerBox: number;
  piecesPerBox: number;
  imageUrl: string | null;
  active: boolean;
  createdAt: string;
};

export type NewProduct = Omit<Product, "id" | "createdAt" | "shopSlug">;

export type Lead = {
  id: string;
  shopSlug: string;
  name: string;
  /** 10 digits, no +91. */
  phone: string;
  status: LeadStatus;
  source: LeadSource;
  notes: string;
  /** Earliest open follow-up, or null when there is none. */
  nextFollowUpAt: string | null;
  lastContactAt: string;
  createdAt: string;
  convertedAt: string | null;
};

export type NewLead = Pick<Lead, "name" | "phone" | "source" | "notes">;

export type Quote = {
  id: string;
  shopSlug: string;
  leadId: string;
  /** Per-shop sequence, 1, 2, 3... */
  seq: number;
  /** "KT-0001". */
  number: string;
  /** Random key in the customer's link. Without it the public page shows nothing. */
  publicKey: string;
  status: QuoteStatus;
  subtotal: number;
  discount: number;
  total: number;
  sentAt: string | null;
  soldAt: string | null;
  notes: string;
  createdAt: string;
};

export type QuoteItem = {
  id: string;
  quoteId: string;
  productId: string;
  position: number;
  qtyBoxes: number;
  /** Set when staff entered the room area instead of boxes. */
  areaSqft: number | null;
  wastagePct: number;
  /** Paise per box, taken from the product when the quote was saved. */
  unitPrice: number;
  lineTotal: number;
};

/** The product fields a quote line shows. */
export type ItemProduct = Pick<Product, "id" | "sku" | "name" | "brand" | "category" | "sizeMm" | "finish" | "sqftPerBox" | "piecesPerBox" | "pricePerBox">;

export type QuoteItemWithProduct = QuoteItem & { product: ItemProduct | null };

export type QuoteWithItems = Quote & { items: QuoteItemWithProduct[] };

/** A line as the store saves it, already priced. */
export type PricedItem = Pick<QuoteItem, "productId" | "qtyBoxes" | "areaSqft" | "wastagePct" | "unitPrice" | "lineTotal">;

export type QuoteContent = { items: PricedItem[]; subtotal: number; discount: number; total: number; notes: string };

export type Followup = {
  id: string;
  shopSlug: string;
  leadId: string;
  quoteId: string | null;
  kind: FollowupKind;
  dueAt: string;
  doneAt: string | null;
  result: string | null;
  createdAt: string;
};

export type NewFollowup = Pick<Followup, "leadId" | "kind" | "dueAt"> & Partial<Pick<Followup, "quoteId" | "doneAt" | "result">>;

export type CrmMessageStatus = "queued" | "sent" | "delivered" | "read" | "failed";

export type CrmMessage = {
  id: string;
  leadId: string;
  quoteId: string | null;
  kind: CrmMessageKind;
  provider: "meta" | "twilio" | "fake";
  /** Last 4 digits only. */
  toMasked: string;
  template: string;
  providerMessageId: string | null;
  status: CrmMessageStatus;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewCrmMessage = Omit<CrmMessage, "id" | "createdAt" | "updatedAt">;

export class DuplicateError extends Error {
  constructor(
    readonly field: "phone" | "sku",
    readonly existingId?: string,
  ) {
    super(`duplicate ${field}`);
    this.name = "DuplicateError";
  }
}

/** The store behind the CRM. Memory for dev and tests, Postgres when DATABASE_URL is set. Every call is scoped to a shop. */
export interface CrmStore {
  readonly kind: "memory" | "postgres";

  listProducts(shop: string): Promise<Product[]>;
  createProduct(shop: string, input: NewProduct): Promise<Product>;
  /** Null when no product in this shop has that id. */
  updateProduct(shop: string, id: string, patch: Partial<NewProduct>): Promise<Product | null>;

  /** Newest first. */
  listLeads(shop: string): Promise<Lead[]>;
  getLead(shop: string, id: string): Promise<Lead | null>;
  /** Throws DuplicateError("phone") when the shop already has this number. */
  createLead(shop: string, input: NewLead, at?: string): Promise<Lead>;
  updateLead(shop: string, id: string, patch: Partial<Pick<Lead, "name" | "source" | "notes" | "status">>): Promise<Lead | null>;
  /** status customer, converted_at set the first time only. */
  markCustomer(shop: string, id: string, at: string): Promise<Lead | null>;
  /** last_contact_at moves forward only. */
  touchLead(shop: string, id: string, at: string): Promise<void>;
  /** Sets next_follow_up_at to the earliest open follow-up, or null. */
  refreshNextFollowUp(shop: string, leadId: string): Promise<void>;

  /** Without items. Newest first. */
  listQuotes(shop: string, opts?: { leadId?: string }): Promise<Quote[]>;
  getQuote(shop: string, id: string): Promise<QuoteWithItems | null>;
  getQuoteByNumber(shop: string, number: string): Promise<QuoteWithItems | null>;
  /** A draft with the next number for the shop. */
  createQuote(shop: string, leadId: string, content: QuoteContent, opts: { prefix: string; publicKey: string; at?: string }): Promise<QuoteWithItems>;
  /** Replaces the items and totals. */
  saveQuote(shop: string, id: string, content: QuoteContent): Promise<QuoteWithItems | null>;
  /** sent sets sent_at, sold sets sold_at. */
  setQuoteStatus(shop: string, id: string, status: QuoteStatus, at: string): Promise<Quote | null>;

  listFollowups(shop: string, opts?: { leadId?: string; open?: boolean }): Promise<Followup[]>;
  createFollowup(shop: string, input: NewFollowup): Promise<Followup>;
  updateFollowup(shop: string, id: string, patch: Partial<Pick<Followup, "dueAt" | "doneAt" | "result">>): Promise<Followup | null>;

  logMessage(input: NewCrmMessage): Promise<CrmMessage>;
  /** Newest first. */
  listMessages(shop: string, opts?: { leadId?: string }): Promise<CrmMessage[]>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string) => UUID.test(value);
