"use client";

/**
 * Motion for the ShowSalsa demo, the same pattern as Lotus and Solstice: LazyMotion + domAnimation + `m.*`.
 * The export only faded its event drawer in (tw-animate `animate-in fade-in`); here the drawers and the modal fade and
 * slide in and out, and the hero photo cross-fades between spotlights. `reducedMotion="user"` drops the movement.
 */

import { AnimatePresence, domAnimation, LazyMotion, m, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

export { AnimatePresence };

export function SalsaMotion({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

const EASE = [0.16, 1, 0.3, 1] as const;

type DialogProps = { className?: string; children: ReactNode; labelledBy: string };

/** The dimmed full-screen layer every dialog sits on. Fades in over 150 ms, as the export did. */
export function DialogBackdrop({ className, children, labelledBy }: DialogProps) {
  return (
    <m.div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className={className}
    >
      {children}
    </m.div>
  );
}

/** A drawer panel: slides in from the right edge. */
export function SlidePanel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <m.div
      initial={{ x: 48, opacity: 0.6 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 48, opacity: 0 }}
      transition={{ duration: 0.28, ease: EASE }}
      className={className}
    >
      {children}
    </m.div>
  );
}

/** The modal card: rises a little and settles. */
export function PopCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <m.div
      initial={{ y: 12, scale: 0.98, opacity: 0 }}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      exit={{ y: 8, opacity: 0 }}
      transition={{ duration: 0.22, ease: EASE }}
      className={className}
    >
      {children}
    </m.div>
  );
}

/** One hero photo layer. A new spotlight fades in over the old one; the first one is in the HTML already. */
export function HeroFade({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} className={className}>
      {children}
    </m.div>
  );
}
