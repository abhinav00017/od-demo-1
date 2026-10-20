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
    ],
  },
} as const;

export type DemoId = keyof typeof LIVE_DEMOS;
export type DemoPage = (typeof LIVE_DEMOS)[DemoId]["pages"][number]["slug"];
