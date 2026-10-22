"use client";

/**
 * "How a visit works" on the home page: four steps on a line that draws itself, and beside them on desktops a
 * phone that plays the WhatsApp confirmation. Built on Motion.tsx; nothing here has its own motion rules.
 */

import { BellRing, CalendarCheck, MessageCircle, Smartphone, Stethoscope, type LucideIcon } from "lucide-react";
import { AnimatePresence, m, useInView, useMotionValue, useSpring, type Variants } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Bubble } from "@/components/mocks/ChatMock";
import { PhoneFrame } from "@/components/mocks/Frames";
import { clinic, type JourneyIcon } from "./data";
import { EASE, SOFT_SPRING, useCalmMotion, useCursorMotion, VIEWPORT } from "./Motion";

const ICONS: Record<JourneyIcon, LucideIcon> = {
  book: CalendarCheck,
  whatsapp: MessageCircle,
  visit: Stethoscope,
  reminder: BellRing,
};

/**
 * The four steps. On scroll into view each node pops in, its text fades up, and the line to the next node draws:
 * down on phones, across from 768px. The WhatsApp node's small phone lights up last.
 */
export function JourneySteps() {
  const calm = useCalmMotion();
  const steps = clinic.journey;
  const node: Variants = {
    hidden: calm ? { opacity: 0 } : { opacity: 0, scale: 0.6 },
    show: { opacity: 1, scale: 1, transition: { ...SOFT_SPRING, stiffness: 320, damping: 22 } },
  };
  const text: Variants = {
    hidden: calm ? { opacity: 0 } : { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.1, ease: EASE } },
  };
  const line = (axis: "x" | "y"): Variants => ({
    hidden: calm ? { opacity: 0 } : axis === "x" ? { scaleX: 0 } : { scaleY: 0 },
    show: { opacity: 1, scaleX: 1, scaleY: 1, transition: { duration: 0.45, delay: 0.15, ease: EASE } },
  });
  const light: Variants = {
    hidden: calm ? { opacity: 0 } : { opacity: 0, scale: 0.6 },
    show: { opacity: 1, scale: 1, transition: { ...SOFT_SPRING, stiffness: 380, damping: 16, delay: 0.35 } },
  };

  return (
    <m.ol
      data-journey=""
      className="grid gap-8 md:grid-cols-4 md:gap-6"
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } } }}
    >
      {steps.map((s, i) => {
        const Icon = ICONS[s.icon];
        const last = i === steps.length - 1;
        return (
          <m.li key={s.title} data-step={s.icon} className="relative flex gap-5 md:flex-col md:items-center md:gap-0 md:text-center" variants={{ hidden: {}, show: {} }}>
            {last ? null : (
              <>
                {/* From this node to the next: down to the next row on phones, across the gap from 768px. */}
                <m.span
                  aria-hidden
                  data-motion=""
                  className="absolute top-14 left-[27px] h-[calc(100%-1.5rem)] w-0.5 origin-top bg-lotus-accent/30 md:hidden"
                  variants={line("y")}
                />
                <m.span
                  aria-hidden
                  data-motion=""
                  className="absolute top-[27px] left-1/2 hidden h-0.5 w-[calc(100%+1.5rem)] origin-left bg-lotus-accent/30 md:block"
                  variants={line("x")}
                />
              </>
            )}
            <m.span
              aria-hidden
              data-motion=""
              className="relative z-10 flex size-14 shrink-0 items-center justify-center rounded-full bg-white text-lotus-accent shadow-lotus ring-1 ring-lotus-hairline"
              variants={node}
            >
              <Icon strokeWidth={1.5} className="size-6" />
              {s.icon === "whatsapp" ? (
                <span data-journey-phone="" className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full bg-white text-lotus-muted ring-1 ring-lotus-hairline">
                  <Smartphone strokeWidth={2} className="size-3.5" />
                  <m.span data-motion="" className="absolute inset-0 flex items-center justify-center rounded-full bg-lotus-accent text-white shadow-[0_0_0_4px] shadow-lotus-accent/15" variants={light}>
                    <Smartphone strokeWidth={2} className="size-3.5" />
                  </m.span>
                </span>
              ) : null}
            </m.span>
            <m.div data-motion="" className="min-w-0 pt-1 md:mt-5 md:pt-0" variants={text}>
              <h3 className="text-lg font-semibold tracking-tight text-lotus-text">{s.title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed">{s.text}</p>
            </m.div>
          </m.li>
        );
      })}
    </m.ol>
  );
}

/** When each step of the chat starts, in ms from the start of a loop. The last step is the final state. */
const TIMELINE = [0, 500, 1700, 2400, 3900, 4400, 5000, 6200];
const FINAL = TIMELINE.length - 1;
/** One loop: the chat plays for ~7 s, rests on the final state, fades and starts again. */
const LOOP_MS = 9000;
const FADE_MS = 400;

const enter = (calm: boolean) => (calm ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 });

/** The typing dots. No exit: the message takes their place at once, so nothing below them jumps. */
function Typing({ calm, side }: { calm: boolean; side: "left" | "right" }) {
  return (
    <m.div
      key={`typing-${side}`}
      data-typing=""
      className={`flex ${side === "right" ? "justify-end" : "justify-start"}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <span className="flex gap-1 rounded-lg bg-wa-in px-3 py-2.5 shadow-sm">
        {[0, 1, 2].map((i) => (
          <m.span
            key={i}
            className="size-1.5 rounded-full bg-wa-time"
            animate={calm ? undefined : { y: [0, -3, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
          />
        ))}
      </span>
    </m.div>
  );
}

/**
 * A phone playing the WhatsApp confirmation: the clinic types, its message arrives, Confirm and Change time pop in,
 * Confirm is pressed, and the clinic says thank you. Loops every 9 s while on screen, with a 2 s rest.
 * The static HTML and reduced motion show the final state. With a desktop cursor the phone drifts up to 8px
 * away from the cursor, listening on its section.
 */
export function PhoneMock({ className = "" }: { className?: string }) {
  const chat = clinic.journeyChat;
  const calm = useCalmMotion();
  const parallax = useCursorMotion();
  const ref = useRef<HTMLDivElement>(null);
  // A wide margin, so the chat resets to its first step before it is on screen.
  const inView = useInView(ref, { margin: "200px 0px" });
  const playing = inView && !calm;
  const [step, setStep] = useState(FINAL);
  const [fading, setFading] = useState(false);
  const [loop, setLoop] = useState(0);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 60, damping: 18 });
  const springY = useSpring(y, { stiffness: 60, damping: 18 });

  useEffect(() => {
    if (!playing) return;
    const timers = TIMELINE.map((at, i) => window.setTimeout(() => setStep(i), at));
    timers.push(window.setTimeout(() => setFading(false), 0));
    timers.push(window.setTimeout(() => setFading(true), LOOP_MS - FADE_MS));
    timers.push(window.setTimeout(() => setLoop((n) => n + 1), LOOP_MS));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [playing, loop]);

  useEffect(() => {
    const section = ref.current?.closest("section");
    if (!parallax || !section) return;
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const box = section.getBoundingClientRect();
      const nx = ((e.clientX - box.left) / box.width - 0.5) * 2;
      const ny = ((e.clientY - box.top) / box.height - 0.5) * 2;
      x.set(-Math.max(-1, Math.min(1, nx)) * 8);
      y.set(-Math.max(-1, Math.min(1, ny)) * 8);
    };
    const leave = () => {
      x.set(0);
      y.set(0);
    };
    section.addEventListener("pointermove", move);
    section.addEventListener("pointerleave", leave);
    return () => {
      section.removeEventListener("pointermove", move);
      section.removeEventListener("pointerleave", leave);
      leave();
    };
  }, [parallax, x, y]);

  const shown = playing ? step : FINAL;
  const pressed = shown === 4;
  return (
    <m.div
      ref={ref}
      role="img"
      aria-label={`A WhatsApp chat: ${clinic.name} confirms a visit, the patient taps Confirm, and the clinic says thank you.`}
      data-phone-mock=""
      data-step={shown}
      className={className}
      style={parallax ? { x: springX, y: springY } : undefined}
    >
      <div aria-hidden>
        <PhoneFrame className="max-w-[17rem] shadow-lotus-lift">
          <div className="flex items-center gap-3 bg-lotus-accent px-4 py-3 text-white">
            <span className="flex size-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold">L</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{clinic.name}</span>
              <span className="block text-[11px] text-white">Business account</span>
            </span>
          </div>
          <m.div
            className="flex h-[25.5rem] flex-col gap-2 bg-lotus-wash p-3"
            animate={{ opacity: fading && playing ? 0 : 1 }}
            transition={{ duration: FADE_MS / 1000 }}
          >
            <p className="flex justify-center">
              <span className="rounded-md bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-wa-time shadow-sm">Today</span>
            </p>
            <AnimatePresence initial={false}>
              {shown === 1 ? <Typing key="typing-clinic" calm={calm} side="left" /> : null}
              {shown >= 2 ? (
                <m.div key="confirmation" initial={enter(calm)} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.35, ease: EASE }}>
                  <Bubble from="business" time="10:02">
                    {chat.confirmation}
                  </Bubble>
                </m.div>
              ) : null}
              {shown >= 3 ? (
                <div key="buttons" data-preview-buttons="" className="-mt-1 flex w-[85%] flex-col gap-1">
                  {chat.buttons.map((b, i) => (
                    <m.span
                      key={b}
                      data-phone-button={b}
                      className="relative overflow-hidden rounded-lg bg-wa-in py-2 text-center text-[13px] font-semibold text-wa-header shadow-sm"
                      initial={calm ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: i === 0 && pressed && !calm ? 0.95 : 1 }}
                      transition={{ opacity: { duration: 0.2, delay: i * 0.1 }, scale: { type: "spring", stiffness: 420, damping: 22, delay: pressed ? 0 : i * 0.1 } }}
                    >
                      {i === 0 ? (
                        <m.span
                          className="absolute inset-0 bg-wa-header/10"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: pressed ? 1 : 0 }}
                          transition={{ duration: 0.2 }}
                        />
                      ) : null}
                      <span className="relative">{b}</span>
                    </m.span>
                  ))}
                </div>
              ) : null}
              {shown >= 5 ? (
                <m.div key="reply" initial={enter(calm)} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.3, ease: EASE }}>
                  <Bubble from="customer" time="10:03">
                    {chat.buttons[0]}
                  </Bubble>
                </m.div>
              ) : null}
              {shown === 6 ? <Typing key="typing-thanks" calm={calm} side="left" /> : null}
              {shown >= 7 ? (
                <m.div key="thanks" data-phone-thanks="" initial={enter(calm)} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.35, ease: EASE }}>
                  <Bubble from="business" time="10:03">
                    {chat.thanks}
                  </Bubble>
                </m.div>
              ) : null}
            </AnimatePresence>
          </m.div>
        </PhoneFrame>
      </div>
    </m.div>
  );
}
