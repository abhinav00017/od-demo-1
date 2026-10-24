/**
 * The showrooms the CRM knows. One today: the made-up Kalyani Tiles & Sanitary.
 * No Node imports: the screens and the public quote page read this too.
 */
export type Shop = {
  slug: string;
  name: string;
  /** Quote numbers start with this, like KT-0001. */
  prefix: string;
  area: string;
  city: string;
  /** Shown on quotes. The onlydevs demo number, never a real shop's. */
  phoneDisplay: string;
  hours: string;
};

export const KALYANI: Shop = {
  slug: "kalyani-tiles",
  name: "Kalyani Tiles & Sanitary",
  prefix: "KT",
  area: "Maddilapalem",
  city: "Visakhapatnam",
  phoneDisplay: "+91 73821 30063",
  hours: "Mon to Sat, 9:30 am to 8:30 pm",
};

export const SHOPS: Shop[] = [KALYANI];

/** The shop every CRM request works on, until staff logins pick one. */
export const DEFAULT_SHOP = KALYANI;

export function getShop(slug: string): Shop | undefined {
  return SHOPS.find((s) => s.slug === slug);
}
