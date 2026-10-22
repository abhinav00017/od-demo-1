"use client";

import { Phone } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import Link from "next/link";
import { useMenuState } from "./MenuState";
import { EASE, useCalmMotion } from "./Motion";

type Item = { href: string; label: string; current: boolean };

export function MobileMenu({
  items,
  book,
  phone,
}: {
  items: Item[];
  book: { href: string; label: string };
  /** The clinic number as a WhatsApp link, so phones get it in the menu. */
  phone: { href: string; label: string };
}) {
  const { open, setOpen } = useMenuState();
  const calm = useCalmMotion();
  // The panel drops 8px into place; under reduced motion it only fades.
  const shut = calm ? { opacity: 0 } : { opacity: 0, y: -8 };
  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="lotus-menu"
        onClick={() => setOpen((o) => !o)}
        className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-lotus-text ring-1 ring-lotus-hairline"
      >
        {open ? "Close" : "Menu"}
      </button>
      <AnimatePresence>
        {open ? (
          <m.div
            key="overlay"
            aria-hidden
            data-lotus-overlay=""
            onClick={() => setOpen(false)}
            className="absolute inset-x-0 top-full z-10 h-dvh bg-lotus-text/15"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          />
        ) : null}
        {open ? (
          <m.nav
            key="panel"
            id="lotus-menu"
            aria-label="Clinic"
            className="absolute inset-x-0 top-full z-20 border-b border-lotus-hairline bg-white px-4 pb-5 shadow-lotus"
            initial={shut}
            animate={{ opacity: 1, y: 0 }}
            exit={shut}
            transition={{ duration: 0.22, ease: EASE }}
          >
            <ul className="divide-y divide-lotus-hairline">
              {items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={item.current ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={`block py-3.5 text-lg font-semibold tracking-tight ${item.current ? "text-lotus-accent" : "text-lotus-text"}`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={book.href}
              onClick={() => setOpen(false)}
              className="mt-3 block rounded-full bg-lotus-accent py-3 text-center font-semibold text-white hover:bg-lotus-accent-hover"
            >
              {book.label}
            </Link>
            <a
              href={phone.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="mt-2.5 flex items-center justify-center gap-2 rounded-full bg-white py-3 font-semibold text-lotus-text tabular-nums ring-1 ring-lotus-hairline"
            >
              <Phone aria-hidden strokeWidth={1.75} className="size-4 text-lotus-accent" />
              <span className="sr-only">WhatsApp</span> {phone.label}
            </a>
          </m.nav>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
