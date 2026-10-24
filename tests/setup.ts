import { cleanup } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";
import { afterEach, vi } from "vitest";

afterEach(() => cleanup());

// next/font only works inside the Next compiler. In tests every font is a stub with class names.
vi.mock("next/font/google", () => {
  const font = () => ({ className: "font-stub", variable: "font-stub-variable", style: { fontFamily: "stub" } });
  return { Fraunces: font, JetBrains_Mono: font, Manrope: font, Outfit: font, Plus_Jakarta_Sans: font };
});

// Motion in jsdom: every animation finishes at once, so exits and count-ups settle on the next frame.
MotionGlobalConfig.skipAnimations = true;

/**
 * jsdom has no IntersectionObserver. This one never fires on its own, so scroll reveals stay in their
 * "hidden" state and figures keep their final text. A test can call `intersectAll()` to bring everything into view.
 */
class TestIntersectionObserver {
  static all = new Set<TestIntersectionObserver>();
  readonly targets = new Set<Element>();
  constructor(private readonly callback: IntersectionObserverCallback) {
    TestIntersectionObserver.all.add(this);
  }
  observe(el: Element) {
    this.targets.add(el);
  }
  unobserve(el: Element) {
    this.targets.delete(el);
  }
  disconnect() {
    this.targets.clear();
    TestIntersectionObserver.all.delete(this);
  }
  takeRecords() {
    return [];
  }
  readonly root = null;
  readonly rootMargin = "0px";
  readonly thresholds = [0];
}
vi.stubGlobal("IntersectionObserver", TestIntersectionObserver);

export function intersectAll() {
  for (const io of [...TestIntersectionObserver.all]) {
    const entries = [...io.targets].map((target) => ({ target, isIntersecting: true, intersectionRatio: 1 }) as unknown as IntersectionObserverEntry);
    if (entries.length) io["callback"](entries, io as unknown as IntersectionObserver);
  }
}

/**
 * jsdom has no matchMedia either. `setReducedMotion(true)` makes the reduced-motion query match and tells
 * every listener, as a browser does when the setting changes.
 */
let reduce = false;
const listeners = new Set<() => void>();
export function setReducedMotion(on: boolean) {
  reduce = on;
  for (const l of listeners) l();
}
vi.stubGlobal("matchMedia", (query: string) => ({
  get matches() {
    return reduce && query.includes("prefers-reduced-motion");
  },
  media: query,
  onchange: null,
  addEventListener: (_: string, l: () => void) => listeners.add(l),
  removeEventListener: (_: string, l: () => void) => listeners.delete(l),
  addListener: (l: () => void) => listeners.add(l),
  removeListener: (l: () => void) => listeners.delete(l),
  dispatchEvent: () => false,
}));
