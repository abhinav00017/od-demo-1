import Link from "next/link";
import type { ReactNode } from "react";
import type { DemoPage } from "@/lib/demos";
import { LotusMark } from "./Art";
import { clinic } from "./data";
import { MobileMenu } from "./MobileMenu";

export type Nav = { base: string; href: (page: DemoPage) => string; page: DemoPage; hubHref: string };

const NAV: { page: DemoPage; label: string }[] = [
  { page: "", label: "Home" },
  { page: "services", label: "Services" },
  { page: "about", label: "About" },
  { page: "contact", label: "Contact" },
];

export function LotusButton({
  href,
  children,
  variant = "solid",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "solid" | "outline" | "light";
  className?: string;
}) {
  const styles = {
    solid: "bg-lotus-teal text-white hover:bg-lotus-teal-deep",
    outline: "text-lotus-teal ring-2 ring-lotus-teal hover:bg-lotus-mint",
    light: "bg-white text-lotus-teal-deep hover:bg-lotus-sand",
  }[variant];
  return (
    <Link href={href} className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold transition ${styles} ${className}`}>
      {children}
    </Link>
  );
}

export function LotusContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-sm font-semibold tracking-wide text-lotus-teal uppercase">{children}</p>;
}

/** The demo bar: tells the viewer this is an onlydevs demo and takes them back to the hub. */
function DemoBar({ hubHref }: { hubHref: string }) {
  return (
    <div className="bg-ink text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-xs sm:px-6 sm:text-sm lg:px-8">
        <p className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-brand-soft" />
          <span className="truncate">
            <span className="font-semibold">onlydevs demo</span>
            <span className="hidden sm:inline"> · a made-up clinic to show the website we build</span>
          </span>
        </p>
        <Link href={hubHref} className="shrink-0 rounded-full px-2 py-1 font-semibold underline-offset-4 hover:underline">
          ← Back to hub
        </Link>
      </div>
    </div>
  );
}

export function LotusSite({ nav, children }: { nav: Nav; children: ReactNode }) {
  const items = NAV.map((n) => ({ href: nav.href(n.page), label: n.label, current: n.page === nav.page }));
  const book = { href: nav.href("book"), label: "Book a visit" };
  return (
    <div data-site="lotus" className="flex min-h-dvh flex-col bg-lotus-cream text-lotus-body">
      <DemoBar hubHref={nav.hubHref} />
      <header className="relative border-b border-lotus-line bg-lotus-cream">
        <LotusContainer className="flex items-center justify-between gap-6 py-4">
          <Link href={nav.base} className="flex items-center gap-2.5 rounded-lg">
            <LotusMark />
            <span className="leading-tight">
              <span className="block font-lotus text-lg font-semibold text-lotus-ink sm:text-xl">{clinic.name}</span>
              <span className="hidden text-xs text-lotus-body sm:block">{clinic.doctor.name} · {clinic.city}</span>
            </span>
          </Link>
          <nav aria-label="Clinic" className="hidden items-center gap-8 md:flex">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.current ? "page" : undefined}
                className={`text-[15px] font-semibold transition ${
                  item.current ? "text-lotus-teal underline decoration-2 underline-offset-8" : "text-lotus-ink hover:text-lotus-teal"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <LotusButton href={book.href} className="px-5 py-2.5 text-[15px]">
              {book.label}
            </LotusButton>
          </nav>
          <MobileMenu items={items} book={book} />
        </LotusContainer>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-lotus-teal-deep text-white">
        <LotusContainer className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="font-lotus text-xl font-semibold">{clinic.name}</p>
            <p className="mt-2 text-sm text-white/85">{clinic.tagline}.</p>
          </div>
          <div>
            <p className="font-semibold">Visit</p>
            <address className="mt-2 text-sm leading-relaxed text-white/85 not-italic">
              {clinic.address.map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
            </address>
          </div>
          <div>
            <p className="font-semibold">Hours</p>
            <ul className="mt-2 space-y-1 text-sm text-white/85">
              {clinic.hours.map((h) => (
                <li key={h.days}>
                  {h.days}: {h.time}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold">Contact</p>
            <p className="mt-2 text-sm text-white/85">{clinic.phone}</p>
            <p className="text-sm text-white/85">{clinic.email}</p>
          </div>
        </LotusContainer>
        <LotusContainer className="border-t border-white/15 py-5 text-xs text-white/85">
          Demo website by onlydevs. Lotus Women&apos;s Clinic and Dr. Ananya Rao are made up.
        </LotusContainer>
      </footer>
    </div>
  );
}
