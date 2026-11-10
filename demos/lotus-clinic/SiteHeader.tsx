"use client";

import { useEffect, useState, type ReactNode } from "react";

/** How far the page scrolls before the desktop header slims down and gains its shadow. */
export const SLIM_AFTER = 24;

/**
 * The Lotus header. From lg it sticks to the top of the screen, so Book an Appointment is always in reach;
 * once the page scrolls past 24px it slims a little and gains a soft shadow and a frosted white background.
 * Below lg it is a plain header that scrolls away (the bottom bar covers booking there). The backdrop blur is
 * lg-only on purpose: a backdrop-filter would trap the phone menu's absolute panel and overlay inside the header.
 * The change is a 200 ms CSS transition, switched off under reduced motion.
 */
export function SiteHeader({ children }: { children: ReactNode }) {
  const [slim, setSlim] = useState(false);
  useEffect(() => {
    const update = () => setSlim(window.scrollY > SLIM_AFTER);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <header
      data-lotus-header=""
      data-slim={slim ? "" : undefined}
      className="group/header relative border-b border-lotus-hairline bg-white transition-[background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none lg:sticky lg:top-0 lg:z-30 lg:data-slim:bg-white/95 lg:data-slim:shadow-lotus lg:data-slim:backdrop-blur-md"
    >
      {children}
    </header>
  );
}
