/**
 * Live demos and their pages. A service with status "live" names one of these ids.
 * The empty slug is the demo's home page at /<industry>/<service>.
 * demos/render.tsx maps each id and page to its component.
 */
export const LIVE_DEMOS = {
  "lotus-clinic": {
    pages: [
      { slug: "", label: "Home" },
      { slug: "services", label: "Services" },
      { slug: "about", label: "About" },
      { slug: "contact", label: "Contact" },
      { slug: "book", label: "Book" },
      { slug: "admin", label: "Clinic dashboard" },
    ],
  },
  /** Solstice Roastery & Bakehouse: one page with in-page anchors (menu, vibe, location, reserve). */
  "solstice-cafe": {
    pages: [{ slug: "", label: "Home" }],
  },
  /** Verdant Crest by Nilaya Developers, a made-up Tellapur real estate project: one landing page with in-page anchors (about, floor plans, faq, contact). */
  "verdant-crest": {
    pages: [{ slug: "", label: "Home" }],
  },
  /** ShowSalsa, a made-up event ticketing platform: one page with drawers for event details, checkout and passes. */
  showsalsa: {
    pages: [{ slug: "", label: "Home" }],
  },
  /** Kalyani Tiles & Sanitary, a made-up showroom: the CRM, one client app behind a login. Screens live in the query string. */
  "tiles-crm": {
    pages: [{ slug: "", label: "CRM" }],
  },
} as const;

export type DemoId = keyof typeof LIVE_DEMOS;
export type DemoPage = (typeof LIVE_DEMOS)[DemoId]["pages"][number]["slug"];
