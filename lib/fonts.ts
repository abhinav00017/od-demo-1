// next/font needs literal options at module scope. Fonts are self-hosted at build time.
import { Fraunces, Inter_Tight, Newsreader, Plus_Jakarta_Sans } from "next/font/google";

/** onlydevs hub: headings and body. */
export const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

/** Headings in the hub's mocks of Lotus services (components/mocks). Not preloaded on hub pages. */
export const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", preload: false });

/** Lotus Women's Clinic site: editorial serif for headings. Applied on the site wrapper only. */
export const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-newsreader",
  display: "swap",
  preload: false,
});

/** Lotus Women's Clinic site: quiet sans for body and UI. */
export const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight", display: "swap", preload: false });
