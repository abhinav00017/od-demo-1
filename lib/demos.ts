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
  /** THE SKY49, a Tellapur real estate project: one landing page with in-page anchors (about, floor plans, faq, contact). */
  sky49: {
    pages: [{ slug: "", label: "Home" }],
  },
} as const;

export type DemoId = keyof typeof LIVE_DEMOS;
export type DemoPage = (typeof LIVE_DEMOS)[DemoId]["pages"][number]["slug"];
