import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { DemoPage } from "@/lib/demos";
import { interTight, newsreader } from "@/lib/fonts";
import { LotusMark } from "./Art";
import { clinic } from "./data";
import { MobileMenu } from "./MobileMenu";
import { buttonClass, buttonSmallClass, textLinkClass } from "./ui";

export type Nav = { base: string; href: (page: DemoPage) => string; page: DemoPage; hubHref: string };

const NAV: { page: DemoPage; label: string }[] = [
  { page: "", label: "Home" },
  { page: "services", label: "Services" },
  { page: "about", label: "About" },
  { page: "contact", label: "Contact" },
];

/** Primary action: solid forest button. */
export function LotusButton({ href, children, small, className = "" }: { href: string; children: ReactNode; small?: boolean; className?: string }) {
  return (
    <Link href={href} className={`${small ? buttonSmallClass : buttonClass} ${className}`}>
      {children}
    </Link>
  );
}

/** Secondary action: text link with an arrow. */
export function LotusLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={`${textLinkClass} ${className}`}>
      {children}
      <ArrowRight aria-hidden className="size-4" />
    </Link>
  );
}

export function LotusContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

/** Small label above a title, in the warm secondary accent. `mark` adds a short rule before it (hero only). */
export function Eyebrow({ children, mark }: { children: ReactNode; mark?: boolean }) {
  return (
    <p className="flex items-center gap-3 text-sm text-lotus-terracotta">
      {mark ? <span aria-hidden className="h-px w-8 shrink-0 bg-lotus-terracotta" /> : null}
      {children}
    </p>
  );
}

type SectionProps = {
  children: ReactNode;
  className?: string;
  "aria-labelledby"?: string;
  /** Full-bleed sage band instead of a hairline rule. Used for at most two sections a page. */
  band?: boolean;
  /** Set on a band that ends the page, so the footer drops its top rule. */
  bandEnd?: boolean;
  /** Draw the top hairline. Turn off for a section that follows a band. */
  rule?: boolean;
};

/** A page section: a hairline rule across the content width (or a sage band), then generous space. */
export function LotusSection({ children, className = "", band, bandEnd, rule = true, ...rest }: SectionProps) {
  const edge = band || !rule ? "" : "border-t border-lotus-rule";
  return (
    <section {...rest} data-band={band ? "" : undefined} data-band-end={bandEnd ? "" : undefined} className={band ? "bg-lotus-sage" : undefined}>
      <LotusContainer>
        <div className={`${edge} py-20 sm:py-28 lg:py-32 ${className}`}>{children}</div>
      </LotusContainer>
    </section>
  );
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
    <div data-site="lotus" className={`${newsreader.variable} ${interTight.variable} group/site flex min-h-dvh flex-col bg-lotus-paper`}>
      {/* The demo bar keeps the hub's font. Only the clinic site below uses the Lotus fonts. */}
      <DemoBar hubHref={nav.hubHref} />
      <div className="flex flex-1 flex-col font-lotus-sans text-[17px] leading-[1.6] text-lotus-grey">
        <header className="relative border-b border-lotus-rule">
          <LotusContainer className="flex items-center justify-between gap-6 py-4 sm:py-5">
            <Link href={nav.base} className="flex items-center gap-3">
              <LotusMark />
              <span>
                <span className="block font-lotus-serif text-xl leading-tight tracking-[-0.01em] text-lotus-text sm:text-[1.4rem]">{clinic.name}</span>
                <span className="hidden text-[13px] leading-tight text-lotus-grey sm:block">
                  {clinic.doctor.name} · {clinic.city}
                </span>
              </span>
            </Link>
            <nav aria-label="Clinic" className="hidden items-center gap-9 md:flex">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={item.current ? "page" : undefined}
                  className={`text-[15px] transition-colors ${
                    item.current ? "text-lotus-forest underline decoration-1 underline-offset-[6px]" : "text-lotus-text hover:text-lotus-forest"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <LotusButton href={book.href} small>
                {book.label}
              </LotusButton>
            </nav>
            <MobileMenu items={items} book={book} />
          </LotusContainer>
        </header>

        <main className="flex-1">{children}</main>

        <footer>
          <LotusContainer>
            <div className="grid gap-10 border-t border-lotus-rule py-16 text-[15px] group-has-[[data-band-end]]/site:border-transparent sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
              <div className="sm:col-span-2 lg:col-span-1">
                <p className="font-lotus-serif text-2xl tracking-[-0.01em] text-lotus-text">{clinic.name}</p>
                <p className="mt-2 max-w-[32ch]">{clinic.tagline}.</p>
              </div>
              <div>
                <p className="font-medium text-lotus-text">Visit</p>
                <address className="mt-3 leading-relaxed not-italic">
                  {clinic.address.map((l) => (
                    <span key={l} className="block">
                      {l}
                    </span>
                  ))}
                </address>
              </div>
              <div>
                <p className="font-medium text-lotus-text">Hours</p>
                <ul className="mt-3 space-y-1 leading-relaxed">
                  {clinic.hours.map((h) => (
                    <li key={h.days}>
                      {h.days}: {h.time}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium text-lotus-text">Contact</p>
                <p className="mt-3">{clinic.phone}</p>
                <p className="break-words">{clinic.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-lotus-rule py-6 text-[13px]">
              <span>Demo website by onlydevs. Lotus Women&apos;s Clinic and Dr. Ananya Rao are made up.</span>
              <Link href={nav.href("admin")} className="font-medium text-lotus-text underline-offset-4 hover:underline">
                Clinic login
              </Link>
            </div>
          </LotusContainer>
        </footer>
      </div>
    </div>
  );
}
