import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Reads the tokens from app/globals.css so the test checks what the site ships.
const css = readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
const tokens = Object.fromEntries([...css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [text, background]. Every pair the UI uses for normal-size text must reach 4.5:1.
const NORMAL: [string, string][] = [
  // hub
  ["ink", "canvas"], ["ink", "canvas-deep"], ["ink", "surface"], ["ink", "chip"],
  ["muted", "surface"], ["muted", "canvas"], ["muted", "canvas-deep"], ["muted", "chip"],
  ["brand", "surface"], ["brand", "canvas"], ["brand", "brand-soft"],
  ["white", "brand"], ["white", "brand-strong"], ["white", "ink"],
  // Lotus site
  ["lotus-text", "lotus-paper"], ["lotus-text", "white"], ["lotus-text", "lotus-stone"],
  ["lotus-grey", "lotus-paper"], ["lotus-grey", "white"], ["lotus-grey", "lotus-stone"],
  ["lotus-forest", "lotus-paper"], ["lotus-forest", "white"], ["lotus-forest", "lotus-stone"],
  ["white", "lotus-forest"], ["white", "lotus-forest-deep"],
  ["lotus-error", "white"], ["lotus-error", "lotus-paper"],
  // Lotus colour pass: terracotta labels (eyebrows, hero italic, 01-04 numbers) on paper, white panels and the sage band
  ["lotus-terracotta", "lotus-paper"], ["lotus-terracotta", "white"], ["lotus-terracotta", "lotus-sage"],
  // Text, secondary text and links on the sage band (testimonials, final CTA); forest initials on the sage portrait panel
  ["lotus-text", "lotus-sage"], ["lotus-grey", "lotus-sage"], ["lotus-forest", "lotus-sage"],
  // Hub mocks of Lotus services
  ["lotus-ink", "lotus-cream"], ["lotus-ink", "lotus-sand"], ["lotus-ink", "lotus-mint"], ["lotus-ink", "white"],
  ["lotus-body", "lotus-cream"], ["lotus-body", "lotus-sand"], ["lotus-body", "lotus-mint"], ["lotus-body", "white"],
  ["lotus-teal", "white"], ["lotus-teal", "lotus-cream"], ["lotus-teal", "lotus-sand"], ["lotus-teal", "lotus-mint"],
  ["lotus-teal-deep", "lotus-mint"], ["lotus-teal-deep", "white"], ["lotus-teal-deep", "lotus-sand"],
  ["white", "lotus-teal"], ["white", "lotus-teal-deep"], ["lotus-rose", "white"],
  // WhatsApp mock
  ["wa-text", "wa-in"], ["wa-text", "wa-out"], ["wa-time", "wa-in"], ["wa-time", "wa-out"], ["wa-time", "wa-bg"],
  ["wa-text", "wa-bg"], ["wa-header", "wa-in"], ["white", "wa-header"], ["g-green", "wa-in"],
  // Google mock
  ["g-text", "white"], ["g-sub", "white"], ["g-blue", "white"], ["white", "g-blue"], ["g-green", "white"],
  ["g-text", "canvas"], ["g-sub", "canvas"],
  // Cafe mock
  ["cafe-crema", "cafe-espresso"], ["cafe-espresso", "cafe-crema"], ["cafe-espresso", "white"],
  ["cafe-body", "cafe-crema"], ["cafe-clay", "white"],
];

// Large text only (24px+, or 18.66px+ bold): 3:1.
const LARGE: [string, string][] = [
  ["tagline", "canvas"],
  ["tagline", "canvas-deep"],
];

// Non-text (WCAG 1.4.11): field borders and focus rings must reach 3:1 against what is next to them.
const NON_TEXT: [string, string][] = [
  ["lotus-edge", "white"],
  ["lotus-edge", "lotus-paper"],
  ["lotus-forest", "lotus-paper"],
  ["lotus-forest", "white"],
  // Focus ring and the forest button's edge on the sage band
  ["lotus-forest", "lotus-sage"],
  // Dashboard live dot (terracotta) on paper and on white
  ["lotus-terracotta", "lotus-paper"],
  ["lotus-terracotta", "white"],
];

describe("WCAG AA contrast", () => {
  it.each(NORMAL)("%s on %s is at least 4.5:1", (fg, bg) => {
    expect(tokens[fg], fg).toBeDefined();
    expect(tokens[bg], bg).toBeDefined();
    expect(ratio(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(LARGE)("%s on %s is at least 3:1 (large text)", (fg, bg) => {
    expect(ratio(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(3);
  });

  it.each(NON_TEXT)("%s against %s is at least 3:1 (borders and focus)", (fg, bg) => {
    expect(tokens[fg], fg).toBeDefined();
    expect(ratio(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(3);
  });
});
