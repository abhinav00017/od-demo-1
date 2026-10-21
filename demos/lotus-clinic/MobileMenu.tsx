"use client";

import Link from "next/link";
import { useState } from "react";

type Item = { href: string; label: string; current: boolean };

export function MobileMenu({ items, book }: { items: Item[]; book: { href: string; label: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="lotus-menu"
        onClick={() => setOpen((o) => !o)}
        className="rounded-full px-4 py-2 text-sm font-semibold text-lotus-ink ring-1 ring-lotus-line"
      >
        {open ? "Close" : "Menu"}
      </button>
      {open ? (
        <nav id="lotus-menu" aria-label="Clinic" className="absolute inset-x-0 top-full z-20 border-b border-lotus-line bg-lotus-cream px-4 pb-6 shadow-lg">
          <ul className="divide-y divide-lotus-line">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={item.current ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={`block py-4 text-lg font-semibold ${item.current ? "text-lotus-teal" : "text-lotus-ink"}`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={book.href}
            onClick={() => setOpen(false)}
            className="mt-4 block rounded-full bg-lotus-teal py-3 text-center font-semibold text-white"
          >
            {book.label}
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
