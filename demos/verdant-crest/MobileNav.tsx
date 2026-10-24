"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useState } from "react";
import { NAV_LINKS, telHref } from "./data";

/**
 * The menu below 1024px: a Call link, and a toggle that drops the in-page links under the sticky header.
 * Escape or any link closes it.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="flex items-center gap-2 lg:hidden">
      <a
        href={telHref}
        className="rounded-full border border-sky-stone/50 bg-white px-3 py-2 text-[10px] font-semibold tracking-wider text-sky-charcoal uppercase"
      >
        Call
      </a>
      <button
        type="button"
        className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-sky-stone/50 bg-white text-sky-charcoal shadow-sm"
        aria-expanded={open}
        aria-controls="verdant-crest-mobile-menu"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="sr-only">Toggle menu</span>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.5" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.5" />
          )}
        </svg>
      </button>

      <AnimatePresence>
        {open ? (
          <m.nav
            key="menu"
            id="verdant-crest-mobile-menu"
            aria-label="Mobile"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute inset-x-0 top-full z-50 border-b border-sky-stone/40 bg-sky-warm-white/98 px-4 py-6 shadow-lg backdrop-blur-md"
          >
            <ul className="flex flex-col gap-4">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="block py-2 text-sm font-medium tracking-widest text-sky-charcoal uppercase"
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="#contact"
                  className="mt-2 block rounded-full bg-sky-charcoal py-3 text-center text-xs font-semibold tracking-widest text-white uppercase"
                  onClick={() => setOpen(false)}
                >
                  Register EOI Now
                </a>
              </li>
            </ul>
          </m.nav>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
