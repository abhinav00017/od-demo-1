// next/font needs literal options at module scope. Fonts are self-hosted at build time.
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";

/** onlydevs hub: headings and body. */
export const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

/** Lotus Women's Clinic demo headings only, so it reads as a different business. Not preloaded on hub pages. */
export const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", preload: false });
