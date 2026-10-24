"use client";

/**
 * Motion for the CRM: light and fast. Lists fade in and slide a few pixels, rows move into place when the list changes,
 * dialogs fade and rise. LazyMotion + domAnimation keeps the bundle small; reduced motion drops the movement.
 */
import { AnimatePresence, domAnimation, LazyMotion, m, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

export { AnimatePresence, m };

export const EASE = [0.22, 1, 0.36, 1] as const;

export function CrmMotion({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

/** A screen or card that fades up when it mounts. */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: EASE, delay }} className={className}>
      {children}
    </m.div>
  );
}

/** A list row that fades in and slides into place when rows above it come or go. */
export function Row({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <m.li layout="position" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: EASE }} className={className}>
      {children}
    </m.li>
  );
}
