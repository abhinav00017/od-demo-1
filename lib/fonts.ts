// next/font needs literal options at module scope. Fonts are self-hosted at build time.
import { Fraunces, JetBrains_Mono, Manrope, Outfit, Plus_Jakarta_Sans } from "next/font/google";

/** onlydevs hub, the Lotus demo site and the Solstice cafe demo: headings and body. */
export const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

/** The hub's Offers and packages mock (font-lotus) and the Solstice headings (font-sol-display). Not preloaded. */
export const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", preload: false });

/** The Solstice cafe demo only (font-sol-mono): prices, times and the ticker. Applied on the Solstice root. Not preloaded. */
export const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap", preload: false });

/** The Verdant Crest real estate demo only (font-sky): headings and body, both Manrope. Applied on the Verdant Crest root. Not preloaded. */
export const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap", preload: false });

/** The ShowSalsa ticketing demo only (font-wing-display): headings, as the export set them. Body stays Plus Jakarta Sans. Not preloaded. */
export const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", weight: ["500", "600", "700", "800"], display: "swap", preload: false });
