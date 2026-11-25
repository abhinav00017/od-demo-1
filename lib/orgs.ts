/**
 * The organizations the app knows: one per client (docs/ogi-database-design.html, section 2). Server code only.
 *
 * The id never changes and is what the database lock uses (org_id on every row, app.org_id for Ogi). The slug only
 * names web addresses and can be renamed without touching any row. These rows match the seed in
 * lib/bookings/schema.sql exactly; tests/orgs.test.ts checks it. Add an organization in both places, together.
 */
export const ORGS = [
  { id: "org_7f3k2a", slug: "lotus-clinic", name: "Lotus Women's Clinic", product: "clinic" },
  { id: "org_2m9qd1", slug: "kalyani-tiles", name: "Kalyani Tiles", product: "tiles" },
  { id: "org_4v8c1n", slug: "solstice-cafe", name: "Solstice Roastery & Bakehouse", product: "cafe" },
] as const;

type KnownOrgId = (typeof ORGS)[number]["id"];
declare const orgBrand: unique symbol;
/** An organization id from the list above. Make one only with orgId() or orgForSlug(). */
export type OrgId = KnownOrgId & { readonly [orgBrand]: true };

export type Org = { id: OrgId; slug: string; name: string; product: string };

export class UnknownOrgError extends Error {
  constructor() {
    // The raw value stays out of the message, so a hostile string never reaches logs.
    super("unknown organization");
    this.name = "UnknownOrgError";
  }
}

export function isKnownOrgId(raw: unknown): raw is KnownOrgId {
  return typeof raw === "string" && ORGS.some((o) => o.id === raw);
}

/** The one way to turn a raw value into an OrgId. Throws UnknownOrgError for anything not in the list. */
export function orgId(raw: unknown): OrgId {
  if (!isKnownOrgId(raw)) throw new UnknownOrgError();
  return raw as OrgId;
}

/** The organization with this slug, or undefined. How the server finds the organization from a page's address. */
export function orgForSlug(slug: unknown): Org | undefined {
  const found = typeof slug === "string" ? ORGS.find((o) => o.slug === slug) : undefined;
  return found && { ...found, id: found.id as OrgId };
}

/**
 * The organization that owns rows with no slug and no parent: the WhatsApp STOP list and no-WhatsApp list.
 * The same value as their DEFAULT in schema.sql. Lotus for now; per-organization lists are an open question.
 */
export const WHATSAPP_LISTS_ORG_ID = orgId("org_7f3k2a");
