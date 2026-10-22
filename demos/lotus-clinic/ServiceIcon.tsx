"use client";

import { Activity, Baby, HeartPulse, Stethoscope, Sun, Video, type LucideIcon } from "lucide-react";
import { m, type TargetAndTransition } from "motion/react";
import type { ServiceIconName } from "./data";
import { EASE, useCardHover, useCursorMotion } from "./Motion";

const ICONS: Record<ServiceIconName, LucideIcon> = {
  baby: Baby,
  stethoscope: Stethoscope,
  "heart-pulse": HeartPulse,
  activity: Activity,
  sun: Sun,
  video: Video,
};

const BOB: TargetAndTransition = { y: [0, -3, 0], transition: { duration: 1.2, ease: "easeInOut", repeat: Infinity } };

/**
 * What each icon does while its card is hovered, on a loop: a heartbeat for fertility, a slow turn of the sun for
 * menopause (one ray's width, so the loop is seamless), and a gentle bob for the rest.
 */
const THEMED: Record<ServiceIconName, TargetAndTransition> = {
  "heart-pulse": { scale: [1, 1.16, 1, 1.1, 1], transition: { duration: 0.9, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.5 } },
  sun: { rotate: [0, 45], transition: { duration: 1.6, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.2 } },
  baby: BOB,
  stethoscope: BOB,
  activity: BOB,
  video: BOB,
};

/** Back at rest when the hover ends. */
const REST: TargetAndTransition = { y: 0, scale: 1, rotate: 0, transition: { duration: 0.3, ease: EASE } };

/**
 * A thin teal line icon in a soft teal circle. Decorative: the service name sits beside it.
 * Inside a `lift` card it moves while the card is hovered: the icon plays its THEMED motion, and with a desktop
 * cursor the circle lifts 2px. Still under reduced motion (the card reports no hover then).
 */
export function ServiceIcon({ name }: { name: ServiceIconName }) {
  const Icon = ICONS[name];
  const hovered = useCardHover();
  const cursor = useCursorMotion();
  return (
    <m.span
      aria-hidden
      data-service-icon={name}
      className="flex size-14 shrink-0 items-center justify-center rounded-full bg-lotus-avatar text-lotus-accent"
      animate={hovered && cursor ? { y: -2, transition: { duration: 0.2, ease: EASE } } : { y: 0, transition: { duration: 0.2, ease: EASE } }}
    >
      <m.span className="flex" animate={hovered ? THEMED[name] : REST}>
        <Icon strokeWidth={1.5} className="size-6" />
      </m.span>
    </m.span>
  );
}
