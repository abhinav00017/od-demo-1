"use client";

/**
 * Motion for the Verdant Crest demo, the same pattern as Lotus and Solstice: LazyMotion + domAnimation + `m.*`.
 * The original site moves very little: the hero lead card fades up 8px 180 ms after load, cards lift on hover (CSS),
 * the WhatsApp button fades in after the first screen. This keeps that feel.
 * `reducedMotion="user"` makes transforms jump instead of move for visitors who ask for less motion.
 */

import { domAnimation, LazyMotion, m, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

export function VerdantCrestMotion({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

/** The hero EOI card: shows 180 ms after load, fading up 8px over 250 ms, as the original's "phase 2" did. */
export function HeroLeadReveal({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <m.div
      data-motion
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18, duration: 0.25, ease: "easeOut" }}
      className={className}
    >
      {children}
    </m.div>
  );
}
