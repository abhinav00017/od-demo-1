// next/font needs literal options at module scope. Fonts are self-hosted at build time.
import { Fraunces, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";

/** onlydevs hub, the Lotus demo site and the Solstice cafe demo: headings and body. */
export const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

/** The hub's Offers and packages mock (font-lotus) and the Solstice headings (font-sol-display). Not preloaded. */
export const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", preload: false });

/** The Solstice cafe demo only (font-sol-mono): prices, times and the ticker. Applied on the Solstice root. Not preloaded. */
export const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap", preload: false });
