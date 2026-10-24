import { ArrowUpRight, Clock, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { jetbrainsMono } from "@/lib/fonts";
import { HeroSunlitTableScene, SectionPhoto } from "./CafeArtVisuals";
import { RUNNING_STRIP_ANNOUNCEMENTS, VIBE_SPACES, WHATSAPP_DISPLAY, cafe, images, whatsAppHref } from "./data";
import { MagneticButton } from "./MagneticButton";
import { MenuGrid } from "./Menu";
import { CardRise, HeroRise, SolsticeMotion } from "./Motion";
import { FooterOrderButton, HeaderOrderButton, HeroOrderButton, OrderProvider } from "./Order";
import { ReservationForm } from "./Reservation";

/** Without JavaScript nothing animates, so everything that waits hidden for its entrance shows at once. */
const NO_SCRIPT_CSS = "[data-motion]{opacity:1!important;transform:none!important}";

const NAV = [
  { href: "#menu", label: "Menu" },
  { href: "#vibe", label: "Vibe" },
  { href: "#location", label: "Location" },
  { href: "#reserve", label: "Reserve" },
];

/** The demo bar: tells the viewer this is an onlydevs demo and takes them back to the hub. */
function DemoBar({ hubHref }: { hubHref: string }) {
  return (
    <div className="bg-ink text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 text-xs sm:px-6 sm:text-sm lg:px-8">
        <p className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-brand-soft" />
          <span className="truncate">
            <span className="font-semibold">onlydevs demo</span>
            <span className="hidden sm:inline"> · a made-up cafe to show the website we build</span>
          </span>
        </p>
        <Link href={hubHref} className="shrink-0 rounded-full px-2 py-1 font-semibold underline-offset-4 hover:underline">
          ← Back to hub
        </Link>
      </div>
    </div>
  );
}

const PROOF = [
  { figure: "1,100m", text: "Direct-trade shade-grown Arabica from Araku Valley & Chikmagalur" },
  { figure: "48 Hours", text: "Cold-fermented heritage wheat sourdough for our wood-fired Deccan pizzas" },
  { figure: "27 Layers", text: "Hand-laminated Osmania croissants baked with cultured butter at 7:30 AM" },
  { figure: "4.9 / 5.0", text: "Rated across 1,420+ verified morning diners in Jubilee Hills & Banjara Hills" },
];

/**
 * Solstice Roastery & Bakehouse, the Cafe → Website live demo: one page with in-page anchors.
 * The page itself is server-rendered; the order tray, menu filters, reservation form and motion are client parts.
 */
export function SolsticeSite({ hubHref }: { hubHref: string }) {
  return (
    <SolsticeMotion>
      <OrderProvider>
        <div
          data-site="solstice"
          className={`${jetbrainsMono.variable} min-h-dvh bg-sol-paper font-sans text-sol-ink antialiased selection:bg-sol-sage/15 selection:text-sol-sage`}
        >
          <noscript>
            <style>{NO_SCRIPT_CSS}</style>
          </noscript>
          <DemoBar hubHref={hubHref} />

          <header className="sticky top-0 z-40 w-full border-b border-sol-stone-200/80 bg-sol-paper/85 backdrop-blur-md">
            <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-6 sm:gap-8 lg:px-8">
              <a href="#" className="shrink-0 font-sol-display text-xl font-semibold tracking-tight whitespace-nowrap text-sol-ink">
                {cafe.wordmark}
              </a>

              <nav aria-label="Primary Navigation" className="hidden items-center gap-8 text-sm font-medium text-sol-stone-600 md:flex">
                {NAV.map((n) => (
                  <a
                    key={n.href}
                    href={n.href}
                    className="shrink-0 whitespace-nowrap underline-offset-8 transition-colors hover:text-sol-ink hover:underline"
                  >
                    {n.label}
                  </a>
                ))}
              </nav>

              <div className="flex shrink-0 items-center">
                <HeaderOrderButton />
              </div>
            </div>
          </header>

          <div
            aria-label="Live Roastery and Bakehouse Announcements"
            role="marquee"
            className="w-full overflow-hidden border-b border-sol-sage-deep bg-sol-sage py-2.5 text-sol-paper"
          >
            <div className="animate-marquee-strip flex items-center">
              {[0, 1].map((dupIndex) => (
                <div key={dupIndex} className="flex shrink-0 items-center" aria-hidden={dupIndex === 1}>
                  {RUNNING_STRIP_ANNOUNCEMENTS.map((item) => (
                    <div key={item} className="flex shrink-0 items-center">
                      <span className="px-6 font-sol-mono text-xs tracking-wider whitespace-nowrap uppercase">{item}</span>
                      <span className="text-xs text-sol-wheat/60 select-none" aria-hidden="true">
                        ✦
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <main>
            {/* Hero: editorial type on the left, the sunlit table photo on the right */}
            <section className="mx-auto max-w-7xl px-6 pt-10 pb-14 lg:px-8 lg:pt-14 lg:pb-20">
              <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
                <div className="flex flex-col justify-between lg:col-span-7">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium tracking-wide text-sol-terra">
                      <span>Road No. 45, Jubilee Hills</span>
                      <span aria-hidden="true">·</span>
                      <span>Sunlit Courtyard Roastery</span>
                      <span aria-hidden="true">·</span>
                      <span>07:30 AM – 11:00 PM</span>
                    </div>

                    <h1 className="mt-4 font-sol-display text-[clamp(2.35rem,4.2vw,3.75rem)] leading-[1.08] font-normal tracking-tight text-balance text-sol-ink">
                      The Freshest Brews in Jubilee Hills
                    </h1>

                    <p className="mt-5 max-w-xl text-base leading-relaxed text-sol-stone-600 lg:text-lg">
                      Set beneath a canopy of old-growth neem trees on Road No. 45, Solstice pairs small-batch Araku and Chikmagalur
                      Arabica roasts with saffron-infused Irani chai, 48-hour sourdough pizzas, and warm Osmania butter croissants.
                    </p>

                    <div className="mt-8 flex flex-wrap items-center gap-4">
                      <MagneticButton
                        href="#menu"
                        className="gap-2 rounded-lg bg-sol-ink px-6 py-3.5 text-sm font-medium text-white shadow-sm hover:bg-sol-stone-800"
                      >
                        <span>Explore Menu</span>
                        <ArrowUpRight aria-hidden className="h-4 w-4" />
                      </MagneticButton>
                      <HeroOrderButton />
                    </div>
                  </div>

                  <div className="mt-10 grid max-w-xl grid-cols-1 gap-6 border-t border-sol-stone-200/80 pt-7 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-sol-stone-500">Today&apos;s Espresso Hopper</p>
                      <p className="mt-1 text-sm font-semibold text-sol-ink">Ratnagiri Estate · Catuai Natural</p>
                      <p className="mt-0.5 text-xs text-sol-stone-500">Cacao nib, blood orange, toasted almond</p>
                    </div>
                    <div>
                      <p className="text-xs text-sol-stone-500">Morning Viennoiserie Batch</p>
                      <p className="mt-1 text-sm font-semibold text-sol-ink">Osmania Cultured Butter Croissants</p>
                      <p className="mt-0.5 text-xs text-sol-stone-500">Fresh from the deck oven every 90 mins</p>
                    </div>
                  </div>
                </div>

                <HeroRise className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-sol-stone-200/90 bg-white shadow-md lg:col-span-5 lg:ml-auto lg:max-w-[450px]">
                  <HeroSunlitTableScene />
                </HeroRise>
              </div>

              <div className="mt-12 grid grid-cols-2 gap-8 border-t border-sol-stone-200/80 pt-8 lg:grid-cols-4">
                {PROOF.map((p) => (
                  <div key={p.figure}>
                    <p className="font-sol-mono text-2xl font-medium text-sol-ink tabular-nums">{p.figure}</p>
                    <p className="mt-1 text-xs text-sol-stone-500">{p.text}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* The menu: category filters and the 4-column grid */}
            <section id="menu" className="scroll-mt-24 border-t border-sol-stone-200/80 bg-sol-oat/60 py-20 lg:py-24">
              <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-medium text-sol-sage">
                      <span>All-Day Kitchen &amp; Espresso Bar</span>
                      <span aria-hidden="true">·</span>
                      <span>Prepared to Order</span>
                    </div>
                    <h2 className="mt-2 font-sol-display text-3xl font-normal tracking-tight text-balance text-sol-ink lg:text-4xl">
                      Elevated Hyderabadi Classics &amp; Single-Origin Brews
                    </h2>
                  </div>
                  <p className="max-w-md text-sm text-sol-stone-600">
                    Every cup is dialed in on our Victoria Arduino Eagle One, paired with seasonal produce sourced from Shamshabad organic
                    farms.
                  </p>
                </div>

                <MenuGrid />
              </div>
            </section>

            {/* The vibe: three spaces and two guest notes */}
            <section id="vibe" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-20 lg:px-8 lg:py-24">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 text-xs font-medium text-sol-terra">
                  <span>Sunlit Architecture</span>
                  <span aria-hidden="true">·</span>
                  <span>Designed for Unhurried Mornings</span>
                </div>
                <h2 className="mt-2 font-sol-display text-3xl font-normal tracking-tight text-balance text-sol-ink lg:text-4xl">
                  Limestone, Dappled Neem Light &amp; Analog Warmth
                </h2>
                <p className="mt-4 text-base leading-relaxed text-sol-stone-600">
                  Conceived as a quiet sanctuary away from the city rush, our two-level bungalow features Tandur limestone floors, skylights
                  framed in reclaimed Burma teak, and high-speed fiber at every courtyard table.
                </p>
              </div>

              <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
                {VIBE_SPACES.map((space, idx) => (
                  <CardRise
                    key={space.index}
                    index={idx}
                    className="group flex flex-col overflow-hidden rounded-xl border border-sol-stone-200/80 bg-white transition-shadow duration-200 hover:shadow-xl"
                  >
                    <SectionPhoto
                      imageUrl={space.imageUrl}
                      alt={space.imageAlt}
                      sizes="(min-width: 1280px) 384px, (min-width: 768px) 33vw, 100vw"
                      className="aspect-[16/10] w-full border-b border-sol-stone-100"
                    />
                    <div className="flex flex-1 flex-col p-6">
                      <p className="font-sol-mono text-xs text-sol-sage tabular-nums">{space.index}</p>
                      <h3 className="mt-2 text-lg font-semibold text-sol-ink">{space.title}</h3>
                      <p className="mt-2.5 text-sm leading-relaxed text-sol-stone-600">{space.description}</p>
                    </div>
                  </CardRise>
                ))}
              </div>

              <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
                <blockquote className="flex flex-col justify-between rounded-xl border border-sol-stone-200/80 bg-white p-6">
                  <p className="text-sm leading-relaxed text-sol-stone-700">
                    &ldquo;Before Solstice opened on Road No. 45, finding a quiet morning work spot in Jubilee Hills with genuine specialty
                    pour-over and authentic Hyderabadi flavours was nearly impossible. Their Araku V60 and warm Osmania croissant are now our
                    studio&apos;s 9:00 AM ritual.&rdquo;
                  </p>
                  <footer className="mt-4 flex items-center justify-between border-t border-sol-stone-100 pt-4 text-xs text-sol-stone-500">
                    <span className="font-semibold text-sol-ink">Ananya Reddy</span>
                    <span>Principal Architect, Studio Deccan · Jubilee Hills</span>
                  </footer>
                </blockquote>

                <blockquote className="flex flex-col justify-between rounded-xl border border-sol-stone-200/80 bg-white p-6">
                  <p className="text-sm leading-relaxed text-sol-stone-700">
                    &ldquo;The Charminar Saffron Irani Chai served alongside a wood-fired Gongura burrata flatbread bridges old-city culinary
                    soul with bright, modern hospitality. Even on packed Sunday mornings, pre-ordering via WhatsApp gets our table served in
                    under 10 minutes.&rdquo;
                  </p>
                  <footer className="mt-4 flex items-center justify-between border-t border-sol-stone-100 pt-4 text-xs text-sol-stone-500">
                    <span className="font-semibold text-sol-ink">Vikramaditya Rao</span>
                    <span>Founder, Twin Cities Culinary Collective</span>
                  </footer>
                </blockquote>
              </div>
            </section>

            {/* Location and the courtyard table reservation */}
            <section id="location" className="scroll-mt-24 border-t border-sol-stone-200/80 bg-white py-20 lg:py-24">
              <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-12 px-6 lg:grid-cols-12 lg:px-8">
                <div className="lg:col-span-6">
                  <div className="flex items-center gap-2 text-xs font-medium text-sol-sage">
                    <span>Visit the Bungalow</span>
                    <span aria-hidden="true">·</span>
                    <span>Complimentary Valet Parking</span>
                  </div>
                  <h2 className="mt-2 font-sol-display text-3xl font-normal tracking-tight text-balance text-sol-ink lg:text-4xl">
                    Plot 284, Road No. 45, Jubilee Hills
                  </h2>
                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-sol-stone-600">
                    Located 200 meters past the Peddamma Temple canopy turnoff, with shaded courtyard seating, pet-friendly garden tables, and
                    dedicated EV charging bays.
                  </p>

                  <div className="mt-6 overflow-hidden rounded-xl border border-sol-stone-200/90 shadow-xs">
                    <SectionPhoto
                      imageUrl={images.courtyard}
                      alt="Solstice Jubilee Hills outdoor sunlit courtyard café seating"
                      sizes="(min-width: 1280px) 592px, (min-width: 1024px) 50vw, 100vw"
                      className="h-56 w-full sm:h-64"
                    />
                  </div>

                  <div className="mt-6 space-y-4 border-t border-sol-stone-200/80 pt-6">
                    <div className="flex items-start gap-3.5">
                      <MapPin aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-sol-sage" />
                      <div>
                        <p className="text-sm font-semibold text-sol-ink">Address</p>
                        <p className="mt-0.5 text-sm text-sol-stone-600">{cafe.address}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5">
                      <Clock aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-sol-sage" />
                      <div>
                        <p className="text-sm font-semibold text-sol-ink">Hours &amp; Bake Times</p>
                        <p className="mt-0.5 text-sm text-sol-stone-600">
                          Monday – Sunday: 07:30 AM – 11:00 PM · Wood-Fired Pizza Oven from 11:30 AM
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5">
                      <Phone aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-sol-sage" />
                      <div>
                        <p className="text-sm font-semibold text-sol-ink">Direct Concierge &amp; WhatsApp</p>
                        <a
                          href={whatsAppHref()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 inline-block font-sol-mono text-sm text-sol-stone-600 tabular-nums underline-offset-4 hover:text-sol-sage hover:underline"
                        >
                          {WHATSAPP_DISPLAY}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <ReservationForm />
              </div>
            </section>
          </main>

          <footer className="border-t border-sol-stone-200/80 bg-sol-paper py-12">
            <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 sm:flex-row sm:items-center lg:px-8">
              <div>
                <p className="font-sol-display text-lg font-semibold text-sol-ink">{cafe.name}</p>
                <p className="mt-1 text-xs text-sol-stone-500">{cafe.shortAddress} · Roasted &amp; Baked Fresh Daily</p>
              </div>
              <div className="flex flex-wrap items-center gap-6 text-xs text-sol-stone-500">
                {NAV.slice(0, 3).map((n) => (
                  <a key={n.href} href={n.href} className="transition-colors hover:text-sol-ink">
                    {n.label}
                  </a>
                ))}
                <FooterOrderButton />
              </div>
            </div>
            <p className="mx-auto mt-8 max-w-7xl px-6 text-xs text-sol-stone-500 lg:px-8">
              Demo website by onlydevs. Solstice Roastery &amp; Bakehouse is a made-up cafe.
            </p>
          </footer>
        </div>
      </OrderProvider>
    </SolsticeMotion>
  );
}
