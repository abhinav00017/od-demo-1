"use client";

/**
 * Motion for the Lotus demo. Every animated piece lives here, as small client components the server pages wrap
 * around their own markup. LazyMotion + domAnimation + `m.*` keeps the bundle small.
 * Rules: transform and opacity only (error messages also animate height), 600 ms at most,
 * except the stats count-up, the ECG line, the phone mock and the loops. Reduced motion: no transforms, no loops.
 * Cursor effects (tilt, magnetic pull, glow follow, parallax) run only with a fine pointer on a screen 1024px or wider.
 */

import {
  animateValue,
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  MotionConfig,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
  type SpringOptions,
  type Transition,
  type Variants,
} from "motion/react";
import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

/** A soft ease-out, used by every entrance. */
export const EASE = [0.22, 1, 0.36, 1] as const;

/** Scroll reveals start when the element is 80px inside the viewport, and run once. */
export const VIEWPORT = { once: true, margin: "-80px" } as const;

export const SOFT_SPRING: Transition = { type: "spring", stiffness: 160, damping: 24, mass: 1 };

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

/** A mouse or trackpad on a desktop-sized screen. Touch screens and tablets never get cursor effects. */
const FINE_POINTER = "(hover: hover) and (pointer: fine) and (min-width: 1024px)";

function subscribeFinePointer(onChange: () => void) {
  const query = window.matchMedia(FINE_POINTER);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** True when cursor effects may run: a fine pointer, 1024px or wider, and no reduced motion. False on the server and during hydration. */
export function useCursorMotion() {
  const calm = useCalmMotion();
  const fine = useSyncExternalStore(
    subscribeFinePointer,
    () => window.matchMedia(FINE_POINTER).matches,
    () => false,
  );
  return fine && !calm;
}

const TILT_SPRING: SpringOptions = { stiffness: 180, damping: 22, mass: 0.6 };
const MAGNET_SPRING: SpringOptions = { stiffness: 220, damping: 18, mass: 0.5 };

/** Where the pointer is over a tilted card, in percent, and how strongly its highlight shows (0 to 1). */
export type TiltPointer = { x: MotionValue<number>; y: MotionValue<number>; glow: MotionValue<number> };

/**
 * Tilts an element toward the cursor, at most `max` degrees, with a 1000px perspective; springs back on leave.
 * Listens on the element itself: spread `handlers` and `style` onto an `m.*` element. Inert without cursor motion.
 */
export function usePointerTilt(max: number) {
  const on = useCursorMotion();
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const x = useMotionValue(50);
  const y = useMotionValue(50);
  const glowTarget = useMotionValue(0);
  const springX = useSpring(rotateX, TILT_SPRING);
  const springY = useSpring(rotateY, TILT_SPRING);
  const glow = useSpring(glowTarget, { stiffness: 120, damping: 20 });
  if (!on) return { on, handlers: {}, style: undefined, pointer: null };
  return {
    on,
    pointer: { x, y, glow } satisfies TiltPointer,
    style: { rotateX: springX, rotateY: springY, transformPerspective: 1000 },
    handlers: {
      onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
        if (e.pointerType === "touch") return;
        const box = e.currentTarget.getBoundingClientRect();
        const nx = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
        const ny = Math.min(1, Math.max(0, (e.clientY - box.top) / box.height));
        // The side under the cursor dips away, so the card leans toward it.
        rotateY.set((nx - 0.5) * 2 * max);
        rotateX.set(-(ny - 0.5) * 2 * max);
        x.set(nx * 100);
        y.set(ny * 100);
        glowTarget.set(1);
      },
      onPointerLeave: () => {
        rotateX.set(0);
        rotateY.set(0);
        glowTarget.set(0);
      },
    },
  };
}

/**
 * Pulls an element toward the cursor while the cursor is over it: up to `max` px, reached when the cursor is
 * `radius` px from its centre; springs back on leave. Listens on the element itself. Inert without cursor motion.
 */
export function useMagnetic(max = 6, radius = 80) {
  const on = useCursorMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, MAGNET_SPRING);
  const springY = useSpring(y, MAGNET_SPRING);
  // The centre is read once on enter, so the element's own movement never feeds back into the pull.
  const centre = useRef<{ x: number; y: number } | null>(null);
  if (!on) return { handlers: {}, style: undefined };
  return {
    style: { x: springX, y: springY },
    handlers: {
      onPointerEnter: (e: ReactPointerEvent<HTMLElement>) => {
        const box = e.currentTarget.getBoundingClientRect();
        centre.current = { x: box.left + box.width / 2 - x.get(), y: box.top + box.height / 2 - y.get() };
      },
      onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
        if (e.pointerType === "touch" || !centre.current) return;
        const dx = e.clientX - centre.current.x;
        const dy = e.clientY - centre.current.y;
        const distance = Math.hypot(dx, dy) || 1;
        const pull = max * Math.min(1, distance / radius);
        x.set((dx / distance) * pull);
        y.set((dy / distance) * pull);
      },
      onPointerLeave: () => {
        centre.current = null;
        x.set(0);
        y.set(0);
      },
    },
  };
}

/** A magnetic wrapper for one pill: an inline box that follows the cursor a few px, so the pill inside keeps its own hover lift. */
export function Magnetic({ children }: { children: ReactNode }) {
  const magnet = useMagnetic();
  return (
    <m.span data-magnetic="" className="inline-flex" style={magnet.style} {...magnet.handlers}>
      {children}
    </m.span>
  );
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

const CardHover = createContext(false);

/** True while the `lift` card around this component is hovered (never under reduced motion). For small hover touches inside a card. */
export function useCardHover() {
  return useContext(CardHover);
}

/**
 * A child of RevealGroup. `lift` adds the card hover (3px up; the shadow comes from ui.lift) and a 0.98 tap,
 * and tells children through useCardHover while it is hovered (the hover stays an object, not a variant label,
 * so the card still takes its entrance from the group).
 * `tilt` leans the card toward the cursor by that many degrees (desktop cursor only).
 * `distance` and `duration` default to the scroll reveal; the hero uses 12px and 0.5 s.
 */
type RevealItemProps = WrapperProps & { from?: From; lift?: boolean; tilt?: number; distance?: number; duration?: number };

export function RevealItem({ tilt = 0, ...props }: RevealItemProps) {
  return tilt ? <TiltedRevealItem tilt={tilt} {...props} /> : <RevealItemBody {...props} lean={null} />;
}

function TiltedRevealItem({ tilt, ...props }: Omit<RevealItemProps, "tilt"> & { tilt: number }) {
  const lean = usePointerTilt(tilt);
  return <RevealItemBody {...props} lean={lean} />;
}

function RevealItemBody({
  as = "div",
  from = "up",
  lift = false,
  distance = 16,
  duration = 0.5,
  lean,
  children,
  ...rest
}: Omit<RevealItemProps, "tilt"> & { lean: ReturnType<typeof usePointerTilt> | null }) {
  const calm = useCalmMotion();
  const [hovered, setHovered] = useState(false);
  const C = TAGS[as] as typeof m.div;
  const gestures =
    lift && !calm
      ? {
          whileHover: { y: -3, transition: { duration: 0.2, ease: EASE } },
          whileTap: { scale: 0.98 },
          onHoverStart: () => setHovered(true),
          onHoverEnd: () => setHovered(false),
          "data-lift": "",
        }
      : lift
        ? { "data-lift": "" }
        : {};
  const tilted = lean?.on ? { style: lean.style, ...lean.handlers } : {};
  return (
    <C data-motion="" variants={itemVariants(from, calm, distance, duration)} {...gestures} {...tilted} {...rest}>
      {lift ? <CardHover.Provider value={hovered && !calm}>{children}</CardHover.Provider> : children}
    </C>
  );
}

const TiltContext = createContext<TiltPointer | null>(null);

/**
 * The hero's doctor card: scales in from 0.96 on a soft spring. With a desktop cursor it tilts toward the
 * cursor (6° at most) and a TiltHighlight inside it follows the pointer.
 */
export function HeroCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const calm = useCalmMotion();
  const tilt = usePointerTilt(6);
  return (
    <TiltContext.Provider value={tilt.pointer}>
      <m.div
        data-motion=""
        data-tilt={tilt.on ? "" : undefined}
        className={className}
        initial={calm ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ opacity: { duration: 0.5, ease: EASE, delay: 0.15 }, scale: { ...SOFT_SPRING, delay: 0.15 } }}
        style={tilt.style}
        {...tilt.handlers}
      >
        {children}
      </m.div>
    </TiltContext.Provider>
  );
}

function Sweep({ pointer }: { pointer: TiltPointer }) {
  const backgroundImage = useMotionTemplate`radial-gradient(circle at ${pointer.x}% ${pointer.y}%, rgba(255, 255, 255, 0.55), transparent 55%)`;
  return <m.span aria-hidden data-tilt-sweep="" className="pointer-events-none absolute inset-0" style={{ backgroundImage, opacity: pointer.glow }} />;
}

/** A soft white light that follows the pointer across a tilted HeroCard. Sits inside a clipped box. Nothing without cursor motion. */
export function TiltHighlight() {
  const pointer = useContext(TiltContext);
  return pointer ? <Sweep pointer={pointer} /> : null;
}

const GLOW_SPRING: SpringOptions = { stiffness: 40, damping: 18, mass: 1.2 };

/** Where the glow is centred in HERO_GLOW (pages.tsx), as a share of the hero's width and height. */
const GLOW_AT = { x: 0.78, y: 0.2 };

/**
 * The hero's faint teal glow, as its own layer so it can drift: a few pixels over 20 s, forever.
 * Animates `transform` as one value, so the browser runs it off the main thread. Still under reduced motion.
 * With a desktop cursor the glow also leans toward the cursor on a slow spring. It listens on the hero section
 * (its parent), and its centre never leaves the hero.
 */
export function HeroGlow({ backgroundImage }: { backgroundImage: string }) {
  const calm = useCalmMotion();
  const drift = useHydrated() && !calm;
  const follow = useCursorMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, GLOW_SPRING);
  const springY = useSpring(y, GLOW_SPRING);

  useEffect(() => {
    const hero = ref.current?.parentElement;
    if (!follow || !hero) return;
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const box = hero.getBoundingClientRect();
      const px = Math.min(box.width, Math.max(0, e.clientX - box.left));
      const py = Math.min(box.height, Math.max(0, e.clientY - box.top));
      // A third of the way from the glow's centre to the cursor: always between the two, so always inside the hero.
      x.set((px - box.width * GLOW_AT.x) * 0.35);
      y.set((py - box.height * GLOW_AT.y) * 0.35);
    };
    const leave = () => {
      x.set(0);
      y.set(0);
    };
    hero.addEventListener("pointermove", move);
    hero.addEventListener("pointerleave", leave);
    return () => {
      hero.removeEventListener("pointermove", move);
      hero.removeEventListener("pointerleave", leave);
      leave();
    };
  }, [follow, x, y]);

  return (
    <span ref={ref} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <m.span data-lotus-glow-follow="" className="absolute inset-0" style={follow ? { x: springX, y: springY } : undefined}>
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
      </m.span>
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

/**
 * A pill link (internal, or external in a new tab) that lifts on hover and presses on tap. `arrow` ends it with an ArrowCircle.
 * `magnetic` also pulls it a few px toward a desktop cursor.
 */
export function PillLink({
  href,
  className = "",
  external = false,
  arrow = false,
  magnetic = false,
  ...rest
}: { href: string; className?: string; external?: boolean; arrow?: boolean; magnetic?: boolean; children: ReactNode } & PassThrough) {
  const link = <PillLinkBody href={href} className={className} external={external} arrow={arrow} {...rest} />;
  return magnetic ? <Magnetic>{link}</Magnetic> : link;
}

function PillLinkBody({
  href,
  className,
  external,
  arrow,
  children,
  ...rest
}: { href: string; className: string; external: boolean; arrow: boolean; children: ReactNode } & PassThrough) {
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

/**
 * The round WhatsApp button, bottom-right on desktops: scales in after the page settles and lifts a touch on hover.
 * With a desktop cursor it is magnetic instead: it follows the cursor a few px, and the hover only grows it.
 */
export function FloatingButton({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  const calm = useCalmMotion();
  const magnet = useMagnetic();
  const hover = magnet.style ? { scale: 1.04 } : { y: -2, scale: 1.04 };
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
      whileHover={calm ? undefined : { ...hover, transition: { duration: 0.2, ease: EASE } }}
      whileTap={calm ? undefined : { scale: 0.96 }}
      style={magnet.style}
      {...magnet.handlers}
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

/** The layout animation features, in their own chunk, for the two places that need them: the booking form and the dashboard. */
const loadLayoutFeatures = () => import("./motionMax").then((mod) => mod.default);

/**
 * Loads layout animations (`layout`, `layoutId`) for its children only, so other Lotus pages never download them.
 * Until the chunk arrives, motion elements inside render still (in their first state): wrap only what needs layout.
 */
export function LayoutMotion({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadLayoutFeatures} strict>
      {children}
    </LazyMotion>
  );
}

/** The plain animations, for a client part that can render without MotionProvider above it (tests render the booking form alone). */
export function PlainMotion({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}

/** A flat line with two heartbeats on it, drawn in the element's own pixels so the stroke stays 2px at any width. */
export function ecgPath(width: number) {
  const beat = (x: number) => `H${x} q4 -5 8 0 H${x + 14} l3 4 l5 -16 l5 22 l4 -10 H${x + 40} q6 -7 12 0`;
  return `M1 16 ${beat(Math.round(width * 0.16))} ${beat(Math.round(width * 0.58))} H${width - 1}`;
}

/** Until the line is measured, it is drawn at this width (it is invisible until then). */
const ECG_FALLBACK = 560;

/**
 * The ECG line under the hero headline: a thin teal heartbeat that draws itself once on load (1.2 s), then rests,
 * with a faint dot riding its tip. 28px tall, as wide as its column. Under reduced motion it fades in, drawn.
 */
export function EcgLine({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState(0);
  const calm = useCalmMotion();
  const hydrated = useHydrated();

  useEffect(() => {
    const el = ref.current;
    // Browsers without ResizeObserver keep the line hidden: it is decoration.
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const w = width || ECG_FALLBACK;
  const d = ecgPath(w);
  const ready = width > 0 && hydrated;
  const draw: Transition = { duration: calm ? 0 : 1.2, ease: "easeInOut", delay: calm ? 0 : 0.25 };
  return (
    <span ref={ref} aria-hidden data-ecg="" className={`relative block h-7 ${className}`}>
      <svg viewBox={`0 0 ${w} 28`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" fill="none">
        <m.path
          d={d}
          className="stroke-lotus-accent"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={ready ? { pathLength: 1, opacity: 1 } : undefined}
          transition={{ pathLength: draw, opacity: { duration: calm ? 0.3 : 0.15, delay: draw.delay } }}
        />
      </svg>
      {ready && !calm ? (
        <m.span
          data-ecg-dot=""
          className="absolute top-0 left-0 size-1.5 rounded-full bg-lotus-accent shadow-[0_0_8px_2px] shadow-lotus-accent/40"
          style={{ offsetPath: `path("${d}")`, offsetRotate: "0deg" }}
          initial={{ offsetDistance: "0%", opacity: 0 }}
          animate={{ offsetDistance: "100%", opacity: [0, 0.8, 0.8, 0] }}
          transition={{ ...draw, opacity: { ...draw, times: [0, 0.1, 0.85, 1] } }}
        />
      ) : null}
    </span>
  );
}

/** Set after the header's mark first blooms, so later pages show it open. Effects never run on the server. */
let bloomed = false;

/** A petal opening from closed: `from` is its folded pose, around the base of the flower. */
function petal(delay: number, opacity: number, calm: boolean, from: { rotate?: number; scaleY?: number }): Variants {
  return {
    closed: calm ? { opacity: 0 } : { opacity: 0, ...from },
    open: { opacity, rotate: 0, scaleY: 1, transition: { duration: 0.3, delay, ease: EASE } },
  };
}

/**
 * The logo mark, blooming: the middle petal rises, then the left and right petals open, 0.6 s in all.
 * Only on the first page of a visit; later pages show it open. Same marks as Art's LotusMark.
 */
export function BloomMark({ className = "size-8" }: { className?: string }) {
  const calm = useCalmMotion();
  const [play] = useState(() => !bloomed);
  useEffect(() => {
    bloomed = true;
  }, []);
  return (
    <m.svg viewBox="0 0 48 48" className={className} aria-hidden data-bloom="" initial={play ? "closed" : false} animate="open">
      <m.path
        data-motion=""
        d="M24 8c5 6 6 14 0 24-6-10-5-18 0-24Z"
        className="fill-lotus-accent"
        style={{ originX: 0.5, originY: 1 }}
        variants={petal(0, 1, calm, { scaleY: 0.2 })}
      />
      <m.path
        data-motion=""
        d="M8 18c8 0 14 5 16 14-9 1-15-4-16-14Z"
        className="fill-lotus-accent"
        style={{ originX: 1, originY: 1 }}
        variants={petal(0.15, 0.55, calm, { rotate: 40 })}
      />
      <m.path
        data-motion=""
        d="M40 18c-8 0-14 5-16 14 9 1 15-4 16-14Z"
        className="fill-lotus-accent"
        style={{ originX: 0, originY: 1 }}
        variants={petal(0.3, 0.55, calm, { rotate: -40 })}
      />
      <path d="M12 38h24" fill="none" className="stroke-lotus-accent" strokeWidth="2" strokeLinecap="round" />
    </m.svg>
  );
}

/**
 * A 2px teal line along the top that fills as the page scrolls. It sits just under the demo bar and sticks to
 * the top of the screen once the bar scrolls away. Takes no space. It moves only with the visitor's own scroll.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  return (
    <div aria-hidden className="pointer-events-none sticky top-0 z-40 h-0">
      <m.div data-scroll-progress="" className="h-0.5 origin-left bg-lotus-accent" style={{ scaleX: scrollYProgress }} />
    </div>
  );
}

/** The section that holds the heading with this id. */
function sectionOf(headingId: string) {
  return document.getElementById(headingId)?.closest("section") ?? null;
}

/**
 * Desktop only: one dot per home section, fixed on the right. The dot of the section across the middle of the
 * screen grows; a click scrolls smoothly to that section and moves focus to its heading.
 * Each dot is a real link to the heading, so it works without JavaScript too.
 */
export function SectionDots({ sections }: { sections: readonly { id: string; label: string }[] }) {
  const calm = useCalmMotion();
  const [active, setActive] = useState(sections[0]?.id);
  const ids = sections.map((s) => s.id).join(" ");

  useEffect(() => {
    const byElement = new Map<Element, string>();
    for (const id of ids.split(" ")) {
      const section = sectionOf(id);
      if (section) byElement.set(section, id);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.isIntersecting ? byElement.get(entry.target) : undefined;
          if (id) setActive(id);
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    for (const el of byElement.keys()) observer.observe(el);
    return () => observer.disconnect();
  }, [ids]);

  return (
    <nav aria-label="Page sections" data-section-dots="" className="fixed top-1/2 right-4 z-20 hidden -translate-y-1/2 flex-col gap-1 lg:flex">
      {sections.map((s) => {
        const on = s.id === active;
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            aria-label={s.label}
            title={s.label}
            aria-current={on ? "true" : undefined}
            className="flex size-6 items-center justify-center rounded-full"
            onClick={(e) => {
              const section = sectionOf(s.id);
              if (!section) return;
              e.preventDefault();
              section.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
              const heading = document.getElementById(s.id);
              if (heading) {
                if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
                heading.focus({ preventScroll: true });
              }
              setActive(s.id);
            }}
          >
            <m.span
              className={`size-2 rounded-full transition-colors duration-200 ${on ? "bg-lotus-accent" : "bg-lotus-field/50"}`}
              animate={calm ? undefined : { scale: on ? 1.6 : 1 }}
              transition={{ duration: 0.25, ease: EASE }}
            />
          </a>
        );
      })}
    </nav>
  );
}

/** A number that ticks when it changes: the old one slides up and out, the new one slides up in. Fades only under reduced motion. */
export function Ticker({ value }: { value: number | string }) {
  const calm = useCalmMotion();
  const from = calm ? { opacity: 0 } : { opacity: 0, y: "100%" };
  const to = calm ? { opacity: 0 } : { opacity: 0, y: "-100%" };
  return (
    <span data-ticker="" className="inline-grid overflow-hidden align-bottom">
      <AnimatePresence initial={false}>
        <m.span key={value} className="[grid-area:1/1]" initial={from} animate={{ opacity: 1, y: 0 }} exit={to} transition={{ duration: 0.3, ease: EASE }}>
          {value}
        </m.span>
      </AnimatePresence>
    </span>
  );
}

/** The success tick: a circle, then a check, each drawing itself (0.6 s in all). Same marks and size as lucide's CheckCircle2. */
export function DrawnCheck({ className = "size-9" }: { className?: string }) {
  const calm = useCalmMotion();
  const line = (delay: number, duration: number): Transition => ({ duration: calm ? 0 : duration, delay: calm ? 0 : delay, ease: EASE });
  return (
    <svg aria-hidden data-drawn-check="" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <m.circle cx="12" cy="12" r="10" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={line(0.1, 0.35)} />
      <m.path d="m9 12 2 2 4-4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={line(0.4, 0.2)} />
    </svg>
  );
}
