"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonClass } from "./ui";

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
        className="min-h-10 rounded-lg border border-lotus-rule px-3.5 text-[15px] font-medium text-lotus-text"
      >
        {open ? "Close" : "Menu"}
      </button>
      {open ? (
        <nav id="lotus-menu" aria-label="Clinic" className="absolute inset-x-0 top-full z-20 border-b border-lotus-rule bg-lotus-paper px-4 pb-8">
          <ul className="divide-y divide-lotus-rule">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={item.current ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={`block py-4 font-lotus-serif text-2xl tracking-[-0.01em] ${item.current ? "text-lotus-forest" : "text-lotus-text"}`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link href={book.href} onClick={() => setOpen(false)} className={`${buttonClass} mt-4 w-full`}>
            {book.label}
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
