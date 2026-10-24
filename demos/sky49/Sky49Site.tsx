import Link from "next/link";
import { manrope } from "@/lib/fonts";
import { NAV_LINKS, PHONE_DISPLAY, SITE_VISIT_TEXT, site, telHref, whatsAppHref } from "./data";
import { MobileNav } from "./MobileNav";
import { Sky49Motion } from "./Motion";
import {
  AboutSky49,
  AmenitiesGallery,
  ContactSection,
  CurrentSiteUpdates,
  FAQSection,
  FloorPlans,
  Hero,
  Highlights,
  InvestorOpportunity,
  InvestorsDesk,
  LocationProximity,
  ProjectGallery,
  SitePlan,
  Specifications,
  StatsBar,
  WhySky49Compare,
  YouTubeWalkthrough,
} from "./sections";
import { SHELL } from "./ui";
import { WhatsAppFloat } from "./WhatsAppFloat";

/** Without JavaScript nothing animates, so everything that waits hidden for its entrance shows at once. */
const NO_SCRIPT_CSS = "[data-motion]{opacity:1!important;transform:none!important}";

/** The demo bar: tells the viewer this is an onlydevs demo and takes them back to the hub. */
function DemoBar({ hubHref }: { hubHref: string }) {
  return (
    <div className="bg-ink font-sans text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 text-xs sm:px-6 sm:text-sm lg:px-10">
        <p className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-brand-soft" />
          <span className="truncate">
            <span className="font-semibold">onlydevs demo</span>
            <span className="hidden sm:inline"> · a client site rebuilt to show the website we build</span>
          </span>
        </p>
        <Link href={hubHref} className="shrink-0 rounded-full px-2 py-1 font-semibold underline-offset-4 hover:underline">
          ← Back to hub
        </Link>
      </div>
    </div>
  );
}

function StickyNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-sky-stone/40 bg-sky-warm-white/90 backdrop-blur-md">
      <div className={`${SHELL} flex items-center justify-between gap-4 py-3`}>
        <a href="#hero" className="group flex items-center leading-tight">
          <span className="flex flex-col">
            <span className="text-xl tracking-tight text-sky-charcoal transition-colors group-hover:text-sky-gold md:text-2xl">{site.name}</span>
            <span className="text-[10px] font-medium tracking-[0.25em] text-sky-muted uppercase">Hyderabad</span>
          </span>
        </a>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-xs font-medium tracking-[0.18em] text-sky-charcoal/80 uppercase transition-colors hover:text-sky-gold">
              {l.label}
            </a>
          ))}
          <a
            href="#contact"
            className="rounded-full border border-sky-gold/50 bg-white px-5 py-2 text-xs font-semibold tracking-wider text-sky-charcoal uppercase shadow-sm transition hover:border-sky-gold hover:bg-sky-gold/10"
          >
            Brochure
          </a>
        </nav>

        <MobileNav />
      </div>
    </header>
  );
}

const FOOTER_LINKS = [
  { href: "#about", label: "About Sky49" },
  { href: "#floor-plans", label: "Floor plans" },
  { href: "#location", label: "Location" },
  { href: "#faq", label: "FAQ" },
  { href: "#project-gallery", label: "Gallery" },
] as const;

function Footer() {
  const { address } = site;
  return (
    <footer className="border-t border-sky-stone/40 bg-sky-warm-white py-14">
      <div className={SHELL}>
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <p className="mt-3 text-2xl text-sky-charcoal">{site.fullName}</p>
            <p className="mt-3 text-sm font-light text-sky-muted">
              {address.streetAddress}, {address.addressLocality}, {address.addressRegion} {address.postalCode}
            </p>
            <p className="mt-3 text-sm font-light text-sky-muted">
              <span className="text-[10px] font-semibold tracking-widest text-sky-muted uppercase">Phone</span>
              <br />
              <a href={telHref} className="font-medium text-sky-charcoal hover:text-sky-gold">
                {PHONE_DISPLAY}
              </a>
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-sky-muted uppercase">Explore</p>
            <ul className="mt-4 space-y-2 text-sm">
              {FOOTER_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-sky-charcoal hover:text-sky-gold">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-sky-muted uppercase">Compliance</p>
            <p className="mt-4 text-sm leading-relaxed font-light text-sky-muted">
              {site.rera}. Marketing collateral is indicative; verify on official portals before purchase.
            </p>
          </div>
        </div>
        <p className="mt-12 border-t border-sky-stone/30 pt-8 text-center text-xs text-sky-muted">
          © 2026 {site.fullName}. Sky49 Hyderabad is a branded residential offering—availability and pricing subject to change.
        </p>
        <p className="mt-3 text-center text-xs text-sky-muted">Demo site by onlydevs. Details for illustration.</p>
      </div>
    </footer>
  );
}

/** The three buttons pinned to the bottom of phones. */
function MobileStickyCTA() {
  const pill = "flex flex-1 items-center justify-center rounded-full py-3 text-[10px] font-semibold tracking-widest uppercase";
  return (
    <div
      role="region"
      aria-label="Quick actions"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-sky-stone/40 bg-sky-warm-white/95 px-3 py-3 backdrop-blur-md sm:hidden"
    >
      <div className="mx-auto flex max-w-lg gap-2">
        <a href={telHref} className={`${pill} border border-sky-charcoal bg-sky-charcoal text-white`}>
          Call now
        </a>
        <a
          href={whatsAppHref(SITE_VISIT_TEXT)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${pill} border border-sky-gold bg-sky-gold/15 text-sky-charcoal`}
        >
          WhatsApp
        </a>
        <a href="#contact" className={`${pill} border border-sky-stone bg-white text-sky-charcoal`}>
          Visit
        </a>
      </div>
    </div>
  );
}

/**
 * THE SKY49, the Real estate → Website live demo: one page with in-page anchors, sections in the original's order.
 * The page is server-rendered; the forms, mobile menu, video and WhatsApp button are client parts.
 */
export function Sky49Site({ hubHref }: { hubHref: string }) {
  return (
    <Sky49Motion>
      <div
        data-site="sky49"
        className={`${manrope.variable} min-h-dvh bg-sky-warm-white pb-24 font-sky text-sky-charcoal antialiased selection:bg-sky-gold/30 selection:text-sky-charcoal sm:pb-0`}
      >
        <noscript>
          <style>{NO_SCRIPT_CSS}</style>
        </noscript>
        <DemoBar hubHref={hubHref} />
        <StickyNav />
        <main>
          <Hero />
          <YouTubeWalkthrough />
          <StatsBar />
          <AboutSky49 />
          <Highlights />
          <CurrentSiteUpdates />
          <InvestorOpportunity />
          <InvestorsDesk />
          <FloorPlans />
          <SitePlan />
          <WhySky49Compare />
          <ProjectGallery />
          <Specifications />
          <AmenitiesGallery />
          <LocationProximity />
          <FAQSection />
          <ContactSection />
        </main>
        <Footer />
        <MobileStickyCTA />
        <WhatsAppFloat />
      </div>
    </Sky49Motion>
  );
}
