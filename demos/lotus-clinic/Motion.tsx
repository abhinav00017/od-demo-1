"use client";

/**
 * Motion for the Lotus demo. Every animated piece lives here, as small client components the server pages wrap
 * around their own markup. LazyMotion + domAnimation + `m.*` keeps the bundle small.
 * Rules: transform and opacity only (error messages also animate height), 600 ms at most,
 * except the stats count-up and the hero glow loop. Reduced motion: no transforms, no loops.
 */

import {
  animateValue,
  domAnimation,
  LazyMotion,
  m,
  MotionConfig,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Transition,
  type Variants,
} from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type HTMLAttributes, type ReactNode } from "react";

/** A soft ease-out, used by every entrance. */
export const EASE = [0.22, 1, 0.36, 1] as const;

/** Scroll reveals start when the element is 80px inside the viewport, and run once. */
const VIEWPORT = { once: true, margin: "-80px" } as const;

const SOFT_SPRING: Transition = { type: "spring", stiffness: 160, damping: 24, mass: 1 };

/** Turns every Lotus motion on. `reducedMotion="user"` also makes any transform jump instead of move. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

const subscribeNothing = () => () => undefined;

/** False on the server and during hydration, true after. */
function useHydrated() {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
}

/**
 * True when the visitor asked for reduced motion. False on the server and during hydration, so the first
 * client render matches the static HTML; the real value comes on the next render.
 */
export function useCalmMotion() {
  const reduced = useReducedMotion();
  return useHydrated() && reduced === true;
}

const TAGS = {
  div: m.div,
  dl: m.dl,
  figure: m.figure,
  h1: m.h1,
  li: m.li,
  p: m.p,
  section: m.section,
  span: m.span,
  ul: m.ul,
};

type Tag = keyof typeof TAGS;

/** Plain attributes the wrappers pass through: class, id, aria and data attributes. */
type PassThrough = Omit<
  HTMLAttributes<HTMLElement>,
  "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration" | "onDrag" | "onDragStart" | "onDragEnd" | "style" | "children"
> & { [data: `data-${string}`]: string | undefined };

type WrapperProps = PassThrough & { as?: Tag; children?: ReactNode };

/** Where a revealed element comes from. */
export type From = "up" | "left" | "right";

function offset(from: From, calm: boolean, distance: number) {
  if (calm) return {};
  if (from === "left") return { x: -distance };
  if (from === "right") return { x: distance };
  return { y: distance };
}

function itemVariants(from: From, calm: boolean, distance: number, duration: number, delay = 0): Variants {
  return {
    hidden: { opacity: 0, ...offset(from, calm, distance) },
    show: { opacity: 1, x: 0, y: 0, transition: { duration, delay, ease: EASE } },
  };
}

/** One block that fades up when it scrolls into view. For section headers, quotes and single cards. */
export function Reveal({ as = "div", delay = 0, from = "up", children, ...rest }: WrapperProps & { delay?: number; from?: From }) {
  const calm = useCalmMotion();
  const C = TAGS[as] as typeof m.div;
  return (
    <C data-motion="" initial="hidden" whileInView="show" viewport={VIEWPORT} variants={itemVariants(from, calm, 16, 0.5, delay)} {...rest}>
      {children}
    </C>
  );
}

/**
 * A list whose RevealItem children come in one after another. On scroll by default;
 * `onMount` runs it as soon as the page loads (the hero).
 */
export function RevealGroup({
  as = "div",
  stagger = 0.08,
  delay = 0,
  onMount = false,
  children,
  ...rest
}: WrapperProps & { stagger?: number; delay?: number; onMount?: boolean }) {
  const C = TAGS[as] as typeof m.div;
  const variants: Variants = { hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } };
  const trigger = onMount ? { animate: "show" } : { whileInView: "show", viewport: VIEWPORT };
  return (
    <C initial="hidden" variants={variants} {...trigger} {...rest}>
      {children}
    </C>
  );
}

/**
 * A child of RevealGroup. `lift` adds the card hover (3px up; the shadow comes from ui.lift) and a 0.98 tap.
 * `distance` and `duration` default to the scroll reveal; the hero uses 12px and 0.5 s.
 */
export function RevealItem({
  as = "div",
  from = "up",
  lift = false,
  distance = 16,
  duration = 0.5,
  children,
  ...rest
}: WrapperProps & { from?: From; lift?: boolean; distance?: number; duration?: number }) {
  const calm = useCalmMotion();
  const C = TAGS[as] as typeof m.div;
  const gestures =
    lift && !calm
      ? { whileHover: { y: -3, transition: { duration: 0.2, ease: EASE } }, whileTap: { scale: 0.98 }, "data-lift": "" }
      : lift
        ? { "data-lift": "" }
        : {};
  return (
    <C data-motion="" variants={itemVariants(from, calm, distance, duration)} {...gestures} {...rest}>
      {children}
    </C>
  );
}

/** The hero's doctor card: scales in from 0.96 on a soft spring. */
export function HeroCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const calm = useCalmMotion();
  return (
    <m.div
      data-motion=""
      className={className}
      initial={calm ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ opacity: { duration: 0.5, ease: EASE, delay: 0.15 }, scale: { ...SOFT_SPRING, delay: 0.15 } }}
    >
      {children}
    </m.div>
  );
}

/**
 * The hero's faint teal glow, as its own layer so it can drift: a few pixels over 20 s, forever.
 * Animates `transform` as one value, so the browser runs it off the main thread. Still under reduced motion.
 */
export function HeroGlow({ backgroundImage }: { backgroundImage: string }) {
  const calm = useCalmMotion();
  const drift = useHydrated() && !calm;
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <m.span
        // Remounts once after hydration, so the drift starts as a fresh mount animation.
        key={drift ? "drift" : "still"}
        data-lotus-glow=""
        className="absolute inset-0"
        style={{ backgroundImage }}
        animate={
          drift
            ? {
                transform: [
                  "translate3d(0px, 0px, 0px) scale(1)",
                  "translate3d(-18px, 10px, 0px) scale(1.04)",
                  "translate3d(10px, -8px, 0px) scale(1.02)",
                  "translate3d(0px, 0px, 0px) scale(1)",
                ],
              }
            : undefined
        }
        transition={{ duration: 20, ease: "easeInOut", repeat: Infinity }}
      />
    </span>
  );
}

type Parsed = { prefix: string; target: number; decimals: number; grouped: boolean; suffix: string };

/** "8,000+" → 8000 with a comma and a "+"; "4.9" → 4.9 with one decimal. Anything else is left as text. */
export function parseFigure(value: string): Parsed | null {
  const match = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(\D*)$/.exec(value);
  if (!match) return null;
  const [, prefix, number, suffix] = match;
  const decimals = number.includes(".") ? number.split(".")[1].length : 0;
  return { prefix, target: Number(number.replace(/,/g, "")), decimals, grouped: number.includes(","), suffix };
}

export function formatFigure(n: number, p: Parsed) {
  const fixed = n.toFixed(p.decimals);
  const [whole, frac] = fixed.split(".");
  const body = p.grouped ? Number(whole).toLocaleString("en-US") : whole;
  return `${p.prefix}${body}${frac ? `.${frac}` : ""}${p.suffix}`;
}

/**
 * A stat figure that counts up from 0 when it scrolls into view: 1.2 s, ease out.
 * The static HTML and reduced motion show the final figure. The final figure also sits invisibly in the same
 * grid cell (as generated content, so it is not read twice), which keeps the width fixed while the digits change.
 */
export function CountUp({ value }: { value: string }) {
  const parsed = parseFigure(value);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, VIEWPORT);
  const calm = useCalmMotion();
  const count = useMotionValue(parsed?.target ?? 0);
  const text = useTransform(count, (n) => (parsed ? formatFigure(n, parsed) : value));
  const target = parsed?.target;

  useEffect(() => {
    if (!inView || calm || target === undefined) return;
    count.jump(0);
    // animateValue drives one number (durations in ms). The full animate() would pull its object and sequence engine into every Lotus page.
    const controls = animateValue({ keyframes: [0, target], duration: 1200, ease: "easeOut", onUpdate: (n) => count.set(n) });
    return () => controls.stop();
  }, [inView, calm, target, count]);

  return (
    <span ref={ref} data-count={value} className="inline-grid after:invisible after:[grid-area:1/1] after:content-[attr(data-count)]">
      <m.span className="[grid-area:1/1]">{text}</m.span>
    </span>
  );
}

const STAR = "M10 1.6l2.5 5.4 5.9.6-4.4 4 1.3 5.8L10 14.5l-5.3 2.9L6 11.6l-4.4-4 5.9-.6L10 1.6Z";

/**
 * Five amber stars that fill in one after another when their card is revealed. Same marks as Art's Stars.
 * Must sit inside a RevealGroup or Reveal, whose "show" starts it.
 */
export function StarsFill({ className = "size-3.5" }: { className?: string }) {
  const calm = useCalmMotion();
  const star: Variants = calm
    ? { hidden: { opacity: 0.25 }, show: { opacity: 1, transition: { duration: 0.3 } } }
    : { hidden: { opacity: 0.25, scale: 0.6 }, show: { opacity: 1, scale: 1, transition: { ...SOFT_SPRING, stiffness: 320 } } };
  return (
    <m.span
      aria-hidden
      data-stars=""
      className="inline-flex items-center gap-0.5"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.35 } } }}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <m.svg key={i} viewBox="0 0 20 20" className={className} variants={star}>
          <path fill="#F59E0B" d={STAR} />
        </m.svg>
      ))}
    </m.span>
  );
}

/** A small teal circle with an arrow, at the right end of an outline pill. The arrow nudges right when the pill is hovered. */
export function ArrowCircle({ className = "size-9" }: { className?: string }) {
  return (
    <span aria-hidden data-arrow-circle="" className={`flex shrink-0 items-center justify-center rounded-full bg-lotus-accent text-white ${className}`}>
      <m.svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{ hover: { x: 3, transition: { duration: 0.2, ease: EASE } } }}
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </m.svg>
    </span>
  );
}

const MotionLink = m.create(Link);

/** The hover lift and tap press of every pill button. Nothing under reduced motion. */
function usePillGestures(disabled = false) {
  const calm = useCalmMotion();
  if (calm || disabled) return {};
  return {
    whileHover: "hover",
    whileTap: "tap",
    variants: { hover: { y: -3, transition: { duration: 0.2, ease: EASE } }, tap: { scale: 0.98 } },
  };
}

/** A pill link (internal, or external in a new tab) that lifts on hover and presses on tap. `arrow` ends it with an ArrowCircle. */
export function PillLink({
  href,
  className = "",
  external = false,
  arrow = false,
  children,
  ...rest
}: { href: string; className?: string; external?: boolean; arrow?: boolean; children: ReactNode } & PassThrough) {
  const gestures = usePillGestures();
  const cls = `${className} hover:shadow-lotus-lift`;
  const body = (
    <>
      {children}
      {arrow ? <ArrowCircle /> : null}
    </>
  );
  if (external) {
    return (
      <m.a href={href} target="_blank" rel="noopener noreferrer" className={cls} {...gestures} {...rest}>
        {body}
      </m.a>
    );
  }
  return (
    <MotionLink href={href} className={cls} {...gestures} {...rest}>
      {body}
    </MotionLink>
  );
}

/** A pill button with the same lift and press. No lift while disabled. */
export function PillButton({
  className = "",
  disabled,
  children,
  ...rest
}: Omit<PassThrough, "onClick"> & { type: "button" | "submit"; disabled?: boolean; onClick?: () => void; children: ReactNode; "aria-busy"?: boolean }) {
  const gestures = usePillGestures(disabled);
  return (
    <m.button className={`${className} hover:shadow-lotus-lift`} disabled={disabled} {...gestures} {...rest}>
      {children}
    </m.button>
  );
}

/** The round WhatsApp button, bottom-right on desktops: scales in after the page settles and lifts a touch on hover. */
export function FloatingButton({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  const calm = useCalmMotion();
  return (
    <m.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-lotus-float=""
      data-motion=""
      className={className}
      initial={calm ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ opacity: { duration: 0.3, delay: 0.5 }, scale: { ...SOFT_SPRING, stiffness: 260, damping: 20, delay: 0.5 } }}
      whileHover={calm ? undefined : { y: -2, scale: 1.04, transition: { duration: 0.2, ease: EASE } }}
      whileTap={calm ? undefined : { scale: 0.96 }}
    >
      {children}
    </m.a>
  );
}

/** Set after the first page mounts, so only later pages fade in. Effects never run on the server. */
let firstPageShown = false;

/**
 * The site's <main>. The first page shows at once (the hero has its own entrance); every page after a
 * navigation fades in over 200 ms. Opacity only, and the page is clickable from the first frame.
 */
export function PageFade({ className, children }: { className?: string; children: ReactNode }) {
  const [fade] = useState(() => firstPageShown);
  useEffect(() => {
    firstPageShown = true;
  }, []);
  return (
    <m.main className={className} initial={fade ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: 0.2, ease: "easeOut" }}>
      {children}
    </m.main>
  );
}
