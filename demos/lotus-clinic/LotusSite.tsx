import { Phone } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { DemoPage } from "@/lib/demos";
import { ArrowCircle, LotusMark } from "./Art";
import { clinic, clinicWhatsAppHref } from "./data";
import { MenuStateProvider } from "./MenuState";
import { MobileBar } from "./MobileBar";
import { MobileMenu } from "./MobileMenu";
import { ui } from "./ui";

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
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  /** `arrow` is the outline pill with a small arrow circle at the right end. */
  variant?: "primary" | "secondary" | "arrow";
  className?: string;
}) {
  if (variant === "arrow") {
    return (
      <Link href={href} className={`${ui.secondaryArrow} ${className}`}>
        <span className="inline-flex items-center gap-2">{children}</span>
        <ArrowCircle />
      </Link>
    );
  }
  return (
    <Link href={href} className={`${ui[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function LotusContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

/** The clinic number in the header. A direct WhatsApp chat, since that is how patients reach the clinic. */
export function WhatsAppNumber({ className = "" }: { className?: string }) {
  return (
    <a
      href={clinicWhatsAppHref}
      target="_blank"
      rel="noopener noreferrer"
      className={`items-center gap-2 rounded-full px-1 py-2 text-[15px] font-medium whitespace-nowrap text-lotus-text tabular-nums transition hover:text-lotus-accent ${className}`}
    >
      <Phone aria-hidden strokeWidth={1.75} className="size-4 text-lotus-accent" />
      <span className="sr-only">WhatsApp</span> {clinic.phone}
    </a>
  );
}

/**
 * Desktop only: a round teal button fixed bottom-right that opens a WhatsApp chat with the clinic.
 * Below lg the sticky bottom bar does the same job, so this one hides there.
 */
function FloatingCall() {
  return (
    <a
      href={clinicWhatsAppHref}
      target="_blank"
      rel="noopener noreferrer"
      data-lotus-float=""
      className="fixed right-6 bottom-6 z-30 hidden size-14 items-center justify-center rounded-full bg-lotus-accent text-white shadow-lotus-lift transition hover:bg-lotus-accent-hover motion-safe:hover:-translate-y-0.5 lg:flex"
    >
      <Phone aria-hidden strokeWidth={1.75} className="size-6" />
      <span className="sr-only">WhatsApp the clinic on {clinic.phone}</span>
    </a>
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

/** The pages with the sticky bottom bar on phones. Book and admin have their own actions. */
export function showsMobileBar(page: DemoPage) {
  return page !== "book" && page !== "admin";
}

export function LotusSite({ nav, children }: { nav: Nav; children: ReactNode }) {
  const items = NAV.map((n) => ({ href: nav.href(n.page), label: n.label, current: n.page === nav.page }));
  const book = { href: nav.href("book"), label: "Book an Appointment" };
  const bar = showsMobileBar(nav.page);
  return (
    <MenuStateProvider>
      <div
        data-site="lotus"
        className={`flex min-h-dvh flex-col bg-white font-sans text-lotus-muted ${bar ? "pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-0" : ""}`}
      >
        <DemoBar hubHref={nav.hubHref} />
        <header className="relative border-b border-lotus-hairline bg-white">
          <LotusContainer className="flex items-center justify-between gap-6 py-3.5">
            <Link href={nav.base} className="flex items-center gap-2.5 rounded-lg">
              <LotusMark />
              <span className="leading-tight">
                <span className="block text-base font-semibold tracking-tight text-lotus-text sm:text-lg">{clinic.name}</span>
                <span className="hidden text-xs text-lotus-muted sm:block">
                  {clinic.doctor.name} · {clinic.city}
                </span>
              </span>
            </Link>
            <div className="flex items-center gap-3 lg:gap-7">
              <nav aria-label="Clinic" className="hidden items-center gap-7 lg:flex">
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={item.current ? "page" : undefined}
                    className={`text-[15px] font-medium transition ${
                      item.current ? "text-lotus-text underline decoration-lotus-accent decoration-2 underline-offset-8" : "text-lotus-muted hover:text-lotus-text"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <WhatsAppNumber className="hidden sm:inline-flex" />
              <div className="hidden lg:block">
                <LotusButton href={book.href} className="px-5 py-2.5 text-[15px]">
                  {book.label}
                </LotusButton>
              </div>
              <MobileMenu items={items} book={book} phone={{ href: clinicWhatsAppHref, label: clinic.phone }} />
            </div>
          </LotusContainer>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-lotus-hairline bg-white">
          <LotusContainer className="grid gap-8 py-12 text-sm sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr] lg:gap-12 lg:py-16">
            <div>
              <p className="flex items-center gap-2 font-semibold text-lotus-text">
                <LotusMark className="size-6" />
                {clinic.name}
              </p>
              <p className="mt-3 max-w-xs">{clinic.tagline}.</p>
              <p className="mt-3">{clinic.address.join(", ")}</p>
            </div>
            <div>
              <p className="font-semibold text-lotus-text">Clinic Hours</p>
              <ul className="mt-3 space-y-1.5">
                {clinic.hours.map((h) => (
                  <li key={h.days}>
                    <span className="text-lotus-text">{h.days}</span>
                    <span className="block">{h.time}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-lotus-text">Contact</p>
              <p className="mt-3 text-lotus-text tabular-nums">{clinic.phone}</p>
              <p className="mt-1.5">{clinic.email}</p>
            </div>
          </LotusContainer>
          <LotusContainer className="flex flex-wrap items-center justify-between gap-3 border-t border-lotus-hairline py-5 text-xs">
            <span>© 2026 {clinic.name}. All rights reserved.</span>
            <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span>Demo website by onlydevs. Lotus Women&apos;s Clinic and Dr. Ananya Rao are made up.</span>
              <Link href={nav.href("admin")} className="font-semibold text-lotus-text underline-offset-4 hover:underline">
                Clinic Login
              </Link>
            </span>
          </LotusContainer>
        </footer>
        {bar ? <FloatingCall /> : null}
        {bar ? <MobileBar bookHref={book.href} whatsapp={{ href: clinicWhatsAppHref, label: clinic.phone }} /> : null}
      </div>
    </MenuStateProvider>
  );
}
