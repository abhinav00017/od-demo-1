"use client";

/**
 * Motion for the Solstice demo, the same pattern as Lotus: LazyMotion + domAnimation + `m.*` keeps the bundle small.
 * Layout animations (the menu grid and the tab underline) load in their own chunk through LayoutMotion.
 * `reducedMotion="user"` makes transforms jump instead of move for visitors who ask for less motion.
 */

import { domAnimation, LazyMotion, m, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

export function SolsticeMotion({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

const loadLayoutFeatures = () => import("./motionFeatures").then((mod) => mod.default);

/** Loads layout animations (`layout`, `layoutId`) for its children only. Until the chunk arrives they render in their first state. */
export function LayoutMotion({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadLayoutFeatures} strict>
      {children}
    </LazyMotion>
  );
}

/** The soft ease-out every Solstice entrance uses. */
export const EASE = [0.16, 1, 0.3, 1] as const;

/** The hero photo: rises 16px and fades in on load. */
export function HeroRise({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <m.div
      data-motion
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className={className}
    >
      {children}
    </m.div>
  );
}

/** A vibe card: rises into view once, one after another, and lifts a little on hover. */
export function CardRise({ index, className, children }: { index: number; className?: string; children: ReactNode }) {
  return (
    <m.div
      data-motion
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className={className}
    >
      {children}
    </m.div>
  );
}
