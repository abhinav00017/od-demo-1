// next/font needs literal options at module scope. Fonts are self-hosted at build time.
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";

/** onlydevs hub and the Lotus demo site: headings and body. */
export const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

/** The hub's Offers and packages mock only (font-lotus). Not preloaded. */
export const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", preload: false });
