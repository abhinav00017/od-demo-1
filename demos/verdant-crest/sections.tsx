import Image from "next/image";
import type { ReactNode } from "react";
import { ContactForm } from "./ContactForm";
import {
  EMAIL,
  PHONE_DISPLAY,
  aboutFacts,
  amenityShots,
  compareRows,
  currentSiteUpdateImages,
  diligenceChecklist,
  faqItems,
  floorPlanRows,
  highlights,
  images,
  mailHref,
  projectGalleryImages,
  proximityRows,
  site,
  specs,
  stats,
  telHref,
} from "./data";
import { HeroEoiForm } from "./HeroEoiForm";
import { HeroLeadReveal } from "./Motion";
import { CTA, KICKER, LIFT_CARD, SHELL } from "./ui";

/** The "Register EOI Now" pill that closes most sections. */
function EoiCta({ className = "mt-8 flex justify-center" }: { className?: string }) {
  return (
    <div className={className}>
      <a href="#contact" className={CTA}>
        Register EOI Now
      </a>
    </div>
  );
}

/** A short gold rule and an uppercase label. */
function Kicker({ children, rule = "w-10", className = "mb-4" }: { children: ReactNode; rule?: string; className?: string }) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className={`h-px bg-sky-gold ${rule}`} aria-hidden="true" />
      <p className={KICKER}>{children}</p>
    </div>
  );
}

export function Hero() {
  return (
    <section id="hero" className="relative isolate min-h-[88svh] scroll-mt-0 overflow-hidden" aria-labelledby="hero-heading">
      <div className="absolute inset-0">
        <Image
          src={images.hero.src}
          alt={images.hero.alt}
          fill
          sizes="100vw"
          loading="eager"
          fetchPriority="high"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-linear-to-b from-sky-warm-white/50 to-sky-warm-white/35" aria-hidden="true" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[88svh] max-w-7xl flex-col justify-end px-4 pt-28 pb-16 sm:px-6 lg:px-10 lg:pt-32 lg:pb-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <h1
              id="hero-heading"
              className="mb-6 max-w-4xl text-4xl leading-[1.05] font-normal tracking-[-0.02em] text-balance text-sky-charcoal sm:text-5xl md:text-6xl lg:text-[3.5rem]"
            >
              Verdant Crest Tellapur Luxury 3 &amp; 4 BHK Apartments
            </h1>
            <p className="inline-flex max-w-2xl bg-[rgb(128_128_128/0.38)] px-3 py-1 text-lg leading-relaxed font-normal text-sky-charcoal backdrop-blur-[1px] sm:text-xl">
              Tellapur, Hyderabad • G+42 Landmark Towers
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <a
                href="#contact"
                className="inline-flex items-center justify-center rounded-full bg-sky-charcoal px-8 py-4 text-center text-xs font-semibold tracking-[0.2em] text-white uppercase transition hover:bg-sky-gold hover:text-sky-charcoal"
              >
                Register EOI Now
              </a>
            </div>
          </div>

          <HeroLeadReveal className="lg:col-span-5">
            <div className="relative w-[min(100%,440px)] overflow-hidden rounded-3xl border border-sky-stone/50 bg-white/92 p-6 sm:p-8">
              <p className="text-3xl leading-[1.15] text-sky-charcoal">Request a EOI</p>
              <p className="mt-2 text-sm text-sky-muted sm:text-base">Priority callback from our advisory desk.</p>
              <HeroEoiForm />
            </div>
          </HeroLeadReveal>
        </div>
      </div>
    </section>
  );
}

export function StatsBar() {
  return (
    <section id="stats" className="border-y border-sky-stone/50 bg-sky-beige/50 py-10" aria-label="Project statistics">
      <div className={`${SHELL} grid grid-cols-2 gap-6 sm:grid-cols-4`}>
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-3xl text-sky-charcoal md:text-4xl">{s.value}</p>
            <p className="mt-1 text-[10px] font-semibold tracking-[0.25em] text-sky-muted uppercase">{s.label}</p>
          </div>
        ))}
      </div>
      <EoiCta />
    </section>
  );
}

export function AboutVerdantCrest() {
  return (
    <section id="about" className="scroll-mt-24 bg-linear-to-b from-sky-warm-white to-sky-beige/30 py-16 md:py-24" aria-labelledby="about-heading">
      <div className={SHELL}>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <div className="sticky top-24 rounded-3xl border border-sky-gold/30 bg-white/90 p-6 shadow-sky-soft sm:p-8">
              <Kicker className="mb-6">About Verdant Crest</Kicker>
              <h2 id="about-heading" className="text-4xl leading-tight text-sky-charcoal md:text-5xl">
                Verdant Crest: luxury living with long-term location value
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-sky-muted sm:text-base">
                Verdant Crest is planned as an ultra-luxury residential address for buyers who want strong daily livability today and
                confident resale relevance tomorrow.
              </p>
              {/* The original page links "quick facts" to a #facts section it does not render; these facts take the anchor. */}
              <dl id="facts" className="mt-8 grid scroll-mt-24 grid-cols-1 gap-3 sm:grid-cols-2">
                {aboutFacts.map((fact) => (
                  <div key={fact.label} className="rounded-2xl border border-sky-stone/40 bg-sky-warm-white/95 p-4">
                    <dt className="text-[10px] font-semibold tracking-[0.22em] text-sky-muted uppercase">{fact.label}</dt>
                    <dd className="mt-2 text-sm leading-relaxed font-medium text-sky-charcoal">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-sky-stone/40 bg-white p-6 shadow-sky-card sm:p-8 md:p-10">
              <figure className="mb-7 overflow-hidden rounded-2xl border border-sky-stone/40 bg-sky-beige/30">
                <Image
                  src={images.about.src}
                  alt={images.about.alt}
                  width={1024}
                  height={682}
                  sizes="(min-width: 1280px) 660px, (min-width: 1024px) 55vw, 100vw"
                  className="aspect-[16/10] w-full object-cover"
                />
              </figure>

              <div className="mb-6 flex flex-wrap gap-2">
                {["Tellapur growth corridor", "Premium high-rise living"].map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-sky-stone/50 bg-sky-warm-white px-3 py-1 text-[10px] font-semibold tracking-[0.2em] text-sky-charcoal uppercase"
                  >
                    {t}
                  </span>
                ))}
              </div>

              <div className="space-y-6 text-base leading-relaxed text-sky-muted">
                <p className="text-lg text-sky-charcoal/90">
                  <strong className="font-medium text-sky-charcoal">Verdant Crest</strong> rises in
                  <strong className="font-medium text-sky-charcoal"> Tellapur</strong> within the city’s premium western corridor. It is
                  positioned for buyers comparing <em>floor plans</em>,<em> location</em>, and <em>price</em> against long-horizon lifestyle
                  quality.
                </p>
                <p>
                  The project narrative combines vertical scale with a full-time residence mindset: high-rise towers, curated amenities, and
                  planning choices that prioritize privacy, circulation, natural light, and social infrastructure rather than only marketing
                  visuals.
                </p>
                <p>
                  Tellapur’s advantage is practical as much as aspirational, with routes toward ORR, Financial District, Gachibowli, and the
                  Neopolis-Kokapet growth belt. That matters for families balancing work commute, school access, and long-term asset
                  liquidity.
                </p>
                <p>
                  From a due-diligence perspective, always verify latest
                  <strong className="font-medium text-sky-charcoal"> RERA and project disclosures</strong> before purchase. For current
                  availability, unit matching, and payment structuring, combine this page’s{" "}
                  <a href="#facts" className="text-sky-gold underline-offset-4 hover:underline">
                    quick facts
                  </a>
                  ,{" "}
                  <a href="#location" className="text-sky-gold underline-offset-4 hover:underline">
                    location section
                  </a>
                  , and{" "}
                  <a href="#faq" className="text-sky-gold underline-offset-4 hover:underline">
                    FAQ
                  </a>{" "}
                  with a guided on-site walkthrough.
                </p>
              </div>
            </div>
          </div>
        </div>
        <EoiCta />
      </div>
    </section>
  );
}

export function Highlights() {
  return (
    <section id="highlights" className="scroll-mt-24 bg-sky-beige/40 py-16 md:py-24">
      <div className={SHELL}>
        <figure className="mb-10 overflow-hidden rounded-3xl border border-sky-stone/40 bg-white shadow-sky-soft">
          <Image
            src={images.highlights.src}
            alt={images.highlights.alt}
            width={1024}
            height={682}
            sizes="(min-width: 1280px) 1200px, 100vw"
            className="h-[220px] w-full object-cover sm:h-[280px] md:h-[340px]"
          />
        </figure>

        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-4">
            <div className="sticky top-24 rounded-3xl border border-sky-gold/30 bg-white p-6 shadow-sky-soft sm:p-8">
              <Kicker>Highlights</Kicker>
              <h2 className="text-3xl text-sky-charcoal md:text-4xl">Why buyers shortlist Verdant Crest</h2>
              <p className="mt-4 text-sm leading-relaxed font-light text-sky-muted">
                Key decision points for premium Hyderabad buyers: skyline value, amenity utility, location logic, and liveability over long
                holding cycles.
              </p>
              <div className="mt-7 rounded-2xl border border-sky-stone/40 bg-sky-warm-white/95 p-4">
                <p className="text-[10px] font-semibold tracking-[0.22em] text-sky-muted uppercase">At a glance</p>
                <div className="mt-3 space-y-2 text-sm text-sky-charcoal">
                  <p>G+42 landmark towers</p>
                  <p>85,000 sq ft amenities</p>
                  <p>Tellapur, Hyderabad</p>
                  <p>3 &amp; 4 BHK focus</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:col-span-8">
            {highlights.map((item, i) => (
              <article key={item.title} className={`group p-6 sm:p-7 ${LIFT_CARD}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold tracking-[0.22em] text-sky-muted uppercase">
                    Highlight {(i + 1).toString().padStart(2, "0")}
                  </p>
                  <span className="h-px w-10 bg-sky-gold/60" aria-hidden="true" />
                </div>
                <h3 className="mt-3 text-2xl text-sky-charcoal">{item.title}</h3>
                <p className="mt-4 text-sm leading-relaxed font-light text-sky-muted">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
        <EoiCta />
      </div>
    </section>
  );
}

/** A grid of 3:2 images, cropped to the given aspect. Used by the site updates and the project gallery. */
function PhotoGrid({ photos, aspect, className }: { photos: { src: string; alt: string }[]; aspect: string; className: string }) {
  return (
    <div className={`grid gap-4 md:grid-cols-3 ${className}`}>
      {photos.map((img) => (
        <figure key={img.alt} className="overflow-hidden bg-white/60">
          <Image
            src={img.src}
            alt={img.alt}
            width={1024}
            height={682}
            sizes="(min-width: 1280px) 395px, (min-width: 768px) 33vw, 100vw"
            className={`${aspect} w-full object-cover`}
          />
        </figure>
      ))}
    </div>
  );
}

export function CurrentSiteUpdates() {
  return (
    <section id="current-site-updates" className="scroll-mt-24 bg-sky-mist py-14 md:py-20">
      <div className={SHELL}>
        <p className="text-center text-[11px] font-semibold tracking-[0.2em] text-sky-charcoal/70 uppercase">Current Site Updates</p>
        <h2 className="mt-3 text-center text-4xl text-sky-charcoal sm:text-5xl md:text-6xl">See Your Future Home Taking Shape</h2>
        <PhotoGrid photos={currentSiteUpdateImages} aspect="aspect-[4/3]" className="mt-10" />
        <EoiCta />
      </div>
    </section>
  );
}

export function InvestorOpportunity() {
  return (
    <section id="investor-opportunity" className="scroll-mt-24 bg-sky-linen py-16 md:py-24">
      <div className={SHELL}>
        <header className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl leading-tight text-sky-charcoal sm:text-5xl">
            Enter Before the
            <span className="block text-sky-gold italic">Address Appreciates</span>
          </h2>
          <p className="mt-4 text-sm font-medium tracking-[0.16em] text-sky-charcoal/75 uppercase sm:text-base">
            Best Deal for Real Estate Investors in Tellapur, Hyderabad
          </p>
        </header>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_1.5fr] lg:items-stretch">
          <div className="space-y-4">
            <article className="border-l-4 border-sky-gold/60 bg-white px-6 py-6 shadow-sm">
              <p className="text-[11px] font-semibold tracking-[0.2em] text-sky-muted uppercase">Current Opportunity</p>
              <p className="mt-3 text-4xl text-sky-charcoal">
                ₹6,850 <span className="text-base font-medium">/ sft</span>
              </p>
              <p className="mt-3 text-sm text-sky-muted">Exclusive pre-launch pricing for early visionaries.</p>
            </article>

            <article className="bg-sky-charcoal px-6 py-6 text-white shadow-sm">
              <p className="text-[11px] font-semibold tracking-[0.2em] text-white/70 uppercase">Projected Value</p>
              <p className="mt-3 text-4xl text-sky-gold">
                ₹10,300 <span className="text-base font-medium text-white/80">/ sft</span>
              </p>
              <p className="mt-3 text-sm text-white/70">Estimated future potential based on Tellapur&apos;s growth corridor.</p>
            </article>
          </div>

          <article className="overflow-hidden border border-sky-stone/30 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
              <div>
                <h3 className="text-3xl text-sky-charcoal">Wealth Narrative</h3>
                <p className="mt-1 text-xs tracking-[0.18em] text-sky-muted uppercase">Tellapur Luxury Real Estate Index</p>
              </div>
              <p className="text-right text-sm font-semibold text-sky-emerald">
                + 50%<span className="block text-[10px] tracking-[0.16em] text-sky-muted uppercase">Expected ROI</span>
              </p>
            </div>

            <div className="relative mx-6 h-56 border-y border-sky-stone/20">
              <div className="absolute inset-x-0 top-[22%] border-t border-sky-stone/20" />
              <div className="absolute inset-x-0 top-[46%] border-t border-sky-stone/20" />
              <div className="absolute inset-x-0 top-[70%] border-t border-sky-stone/20" />
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 600 220" preserveAspectRatio="none" aria-hidden="true">
                <path d="M10 170 C120 158, 190 120, 270 110 C360 96, 440 62, 590 52" fill="none" className="stroke-sky-gold-line" strokeWidth="4" />
                <circle cx="8" cy="170" r="6" className="fill-sky-linen stroke-sky-gold-line" strokeWidth="3" />
                <circle cx="585" cy="52" r="8" className="fill-sky-gold-line stroke-sky-gold-ring" strokeWidth="2" />
              </svg>
              <div className="absolute bottom-4 left-0 text-xs text-sky-muted">Launch</div>
              <div className="absolute bottom-4 left-[42%] text-xs text-sky-muted">Mid-way</div>
              <div className="absolute right-0 bottom-4 text-xs text-sky-charcoal">Handover</div>
            </div>

            <div className="grid gap-2 px-6 py-5 text-center text-[11px] font-medium tracking-[0.16em] text-sky-muted uppercase sm:grid-cols-3">
              <p>RERA Registered</p>
              <p>On-time Delivery</p>
              <p>High Appreciation</p>
            </div>
          </article>
        </div>
        <EoiCta />
      </div>
    </section>
  );
}

export function InvestorsDesk() {
  return (
    <section id="for-investors" className="scroll-mt-24 bg-sky-charcoal py-16 text-white md:py-24">
      <div className={`${SHELL} grid gap-8 lg:grid-cols-12`}>
        <div className="lg:col-span-7">
          <p className="text-xs font-semibold tracking-[0.2em] text-sky-gold/80 uppercase">Dedicated Investor Section</p>
          <h2 className="mt-3 text-4xl leading-tight sm:text-5xl">Built for Investors Evaluating Long-Term Value</h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/75">
            This advisory desk is tailored for investors who compare entry price, growth corridor momentum, rental suitability, and
            liquidity outlook before making allocation decisions in Tellapur.
          </p>
        </div>
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-white/20 bg-white/5 p-6">
            <h3 className="text-2xl text-sky-gold">Investor Assistance Includes</h3>
            <ul className="mt-4 space-y-3 text-sm text-white/80">
              <li>Pre-launch vs post-launch pricing trajectory walkthrough</li>
              <li>Tower-by-tower inventory and demand-side comparisons</li>
              <li>Rental yield and exit strategy discussion (holding horizon based)</li>
              <li>Funding and payment milestone advisory for smoother cashflow planning</li>
            </ul>
            <a
              href="#contact"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-sky-gold px-6 py-3 text-xs font-semibold tracking-[0.16em] text-sky-charcoal uppercase transition hover:bg-white"
            >
              Register EOI Now
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FloorPlans() {
  return (
    <section id="floor-plans" className="scroll-mt-24 bg-sky-wheat py-16 md:py-24">
      <div className={SHELL}>
        <div className="max-w-4xl">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-sky-charcoal/80 uppercase">Floor Plan</p>
          <h2 className="mt-3 text-4xl leading-tight text-sky-charcoal sm:text-5xl">Empowering Your Decision for a Refined Dream Living</h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-sky-charcoal/80">
            Thoughtfully designed 3 &amp; 4 BHK luxury floor plans at Verdant Crest are crafted to maximize space, privacy, natural light, and
            everyday comfort.
          </p>
        </div>

        <div className="mt-10 border-t border-sky-charcoal/25">
          {floorPlanRows.map((row) => (
            <article
              key={row.label}
              className="grid items-center gap-5 border-b border-sky-charcoal/25 py-4 md:grid-cols-[90px_minmax(220px,1fr)_260px_220px] md:gap-x-12 md:py-6"
            >
              <p className="text-4xl leading-none font-semibold text-sky-charcoal">{row.label}</p>
              <h3 className="text-xl text-sky-charcoal">{row.name}</h3>
              <Image
                src={row.image}
                alt={row.name}
                width={1600}
                height={1112}
                sizes="(min-width: 768px) 176px, 320px"
                className="h-60 w-80 max-w-full justify-self-start border border-sky-charcoal/15 bg-[#fbfaf7] object-contain md:h-44 md:w-44"
              />
              <a
                href="#contact"
                className="inline-flex items-center justify-center justify-self-start rounded-full bg-sky-charcoal px-5 py-2 text-xs font-medium text-white transition hover:bg-black md:justify-self-end"
              >
                Register EOI Now →
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SitePlan() {
  return (
    <section id="site-plan" className="scroll-mt-24 bg-sky-fog py-16 md:py-24">
      <div className={SHELL}>
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl text-sky-charcoal md:text-5xl">Site Plan</h2>
          <p className="mt-5 text-lg leading-relaxed font-light text-sky-muted md:text-2xl">
            Designed with a people-first approach, the site plan blends spacious layouts with abundant greenery. Well-aligned buildings,
            open courtyards, broad internal pathways, and thoughtfully placed amenities promote natural light, easy access, and a calm,
            organized living experience throughout the community.
          </p>
        </div>
        <div className="mx-auto mt-12 max-w-5xl rounded-sm border border-sky-stone/60 bg-white p-3 shadow-[0_10px_24px_rgba(0,0,0,0.14)] sm:p-5">
          <Image
            src={images.sitePlan.src}
            alt={images.sitePlan.alt}
            width={images.sitePlan.width}
            height={images.sitePlan.height}
            sizes="(min-width: 1024px) 984px, 100vw"
            className="w-full border border-sky-stone/50 bg-white object-contain"
          />
        </div>
        <EoiCta />
      </div>
    </section>
  );
}

export function WhyVerdantCrestCompare() {
  return (
    <section id="comparison" className="scroll-mt-24 bg-sky-warm-white py-16 md:py-24">
      <div className={SHELL}>
        <div className="mb-12 max-w-2xl">
          <Kicker>Comparison</Kicker>
          <h2 className="text-3xl text-sky-charcoal md:text-4xl">Why Verdant Crest</h2>
          <p className="mt-4 text-sky-muted">
            A transparent, citation-friendly comparison for investors and end-users evaluating <strong>Verdant Crest</strong> against
            typical luxury launches—without naming competitors.
          </p>
        </div>
        <div className="space-y-6">
          {compareRows.map((r) => (
            <div key={r.title} className="grid gap-4 rounded-2xl border border-sky-stone/50 bg-white p-6 shadow-sm md:grid-cols-2 md:p-8">
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] text-sky-gold uppercase">Verdant Crest</p>
                <h3 className="mt-2 text-xl text-sky-charcoal">{r.title}</h3>
                <p className="mt-3 text-sm leading-relaxed font-light text-sky-muted">{r.ours}</p>
              </div>
              <div className="border-t border-sky-stone/40 pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-8">
                <p className="text-[10px] font-bold tracking-[0.2em] text-sky-muted uppercase">Typical luxury tower</p>
                <p className="mt-6 text-sm leading-relaxed font-light text-sky-muted md:mt-10">{r.typical}</p>
              </div>
            </div>
          ))}
        </div>
        <EoiCta />
      </div>
    </section>
  );
}

/** The demo has no API, so the gallery shows its images directly. */
export function ProjectGallery() {
  return (
    <section id="project-gallery" className="scroll-mt-24 bg-sky-mist py-16 md:py-20">
      <div className={SHELL}>
        <p className="text-center text-[11px] font-semibold tracking-[0.2em] text-sky-charcoal/70 uppercase">Project Gallery</p>
        <h2 className="mt-3 text-center text-4xl text-sky-charcoal sm:text-5xl md:text-6xl">Experience the Lifestyle Before You Live It</h2>
        <PhotoGrid photos={projectGalleryImages} aspect="aspect-[16/10]" className="mt-8" />
        <EoiCta />
      </div>
    </section>
  );
}

export function Specifications() {
  return (
    <section id="specifications" className="scroll-mt-24 border-t border-sky-stone/40 bg-sky-cream py-16 text-sky-charcoal md:py-24">
      <div className={SHELL}>
        <div className="mb-12 grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <div className="mb-4 flex items-center gap-4">
              <div className="h-px w-10 bg-sky-gold/90" aria-hidden="true" />
              <p className="text-xs font-semibold tracking-[0.25em] text-sky-charcoal/65 uppercase">Specifications</p>
            </div>
            <h2 className="text-3xl text-sky-charcoal md:text-5xl">Verdant Crest specifications with practical clarity</h2>
            <p className="mt-4 max-w-3xl text-sky-charcoal/70">
              Use this section as a quick diligence snapshot for <strong>Verdant Crest</strong>. Final drawings, brands, and compliance
              documents should always be validated during your site visit and official review.
            </p>
          </div>
          <div className="rounded-2xl border border-sky-stone/50 bg-white p-5 shadow-sm lg:col-span-4">
            <p className="text-[11px] tracking-[0.22em] text-sky-charcoal/60 uppercase">Snapshot</p>
            <p className="mt-2 text-3xl font-semibold text-sky-charcoal">{specs.length}</p>
            <p className="mt-1 text-sm text-sky-charcoal/70">Core specification categories covered</p>
          </div>
        </div>

        <div className="grid gap-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {specs.map((row) => (
              <article key={row.label} className={`group p-6 ${LIFT_CARD}`}>
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-charcoal text-white shadow-sm">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                      <path d={row.icon} stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-xs font-semibold tracking-[0.22em] text-sky-charcoal/70 uppercase">{row.label}</p>
                    <p className="mt-2 text-sm leading-relaxed text-sky-charcoal/80">{row.value}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="rounded-2xl border border-sky-gold/30 bg-linear-to-r from-white to-sky-gold-wash p-6 shadow-sm md:p-7">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-sky-charcoal/65 uppercase">Before you finalize</p>
            <h3 className="mt-2 text-2xl text-sky-charcoal">Diligence checklist</h3>
            <ul className="mt-5 grid gap-3 text-sm leading-relaxed text-sky-charcoal/80 md:grid-cols-2">
              {diligenceChecklist.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-gold" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </aside>
        </div>
        <EoiCta />
      </div>
    </section>
  );
}

export function AmenitiesGallery() {
  return (
    <section id="amenities" className="scroll-mt-24 bg-sky-beige/40 py-16 md:py-24">
      <div className={SHELL}>
        <div className="mb-10 max-w-3xl">
          <Kicker>Amenities gallery</Kicker>
          <h2 className="text-3xl text-sky-charcoal md:text-4xl">Amenities at Verdant Crest</h2>
          <p className="mt-4 text-sky-muted">
            Editorial references for lifestyle scale—actual Verdant Crest amenities may vary by tower phase. Confirm the latest amenity list and
            opening sequence during your tour.
          </p>
          <p className="mt-4 text-sm leading-relaxed font-light text-sky-muted">
            An 85,000 sq ft amenity footprint is meaningful only when programming matches real usage: weekday peak hours, children’s
            schedules, elder accessibility, and weekend guest traffic. Ask how the developer sequences club openings, staffing, and maintenance
            budgets—premium living is operational, not merely decorative.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {amenityShots.map((img) => (
            <figure key={img.src} className="group overflow-hidden rounded-2xl border border-sky-stone/40 bg-white shadow-sm">
              <Image
                src={img.src}
                alt={img.alt}
                width={1024}
                height={682}
                sizes="(min-width: 1280px) 395px, (min-width: 640px) 33vw, 100vw"
                className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-[1.03]"
              />
            </figure>
          ))}
        </div>
        <EoiCta />
      </div>
    </section>
  );
}

export function LocationProximity() {
  return (
    <section id="location" className="scroll-mt-24 bg-sky-warm-white py-16 md:py-24">
      <div className={SHELL}>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="min-w-0">
            <Kicker>Location</Kicker>
            <h2 className="text-3xl text-sky-charcoal md:text-4xl">Verdant Crest location &amp; proximity</h2>
            <p className="mt-4 text-sky-muted">
              The map shows the <strong>{site.area}</strong> area. Drive times vary by time of day—treat the table as directional, not
              guaranteed.
            </p>
            <p className="mt-4 text-sm leading-relaxed font-light text-sky-muted">
              Buyers comparing <strong>Verdant Crest</strong> with other west-city projects should test routes during your own peak-hour
              windows—especially ORR merges and IT-corridor choke points. The goal is not the shortest map line; it is the most predictable
              weekly rhythm for your household.
            </p>

            <div className="mt-8 overflow-hidden rounded-2xl border border-sky-stone/50 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Verdant Crest proximity drive times to major Hyderabad hubs</caption>
                <thead className="bg-sky-beige/60 text-xs font-semibold tracking-wider text-sky-charcoal uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-3 md:px-5">
                      Destination
                    </th>
                    <th scope="col" className="px-4 py-3 md:px-5">
                      Indicative time
                    </th>
                    <th scope="col" className="hidden px-4 py-3 md:table-cell md:px-5">
                      Note
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-stone/50 text-sky-muted">
                  {proximityRows.map((row) => (
                    <tr key={row.destination}>
                      <th scope="row" className="px-4 py-4 font-medium text-sky-charcoal md:px-5">
                        {row.destination}
                      </th>
                      <td className="px-4 py-4 font-light md:px-5">{row.time}</td>
                      <td className="hidden px-4 py-4 font-light md:table-cell md:px-5">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/50 bg-white/75 p-2 shadow-sky-soft backdrop-blur-md">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-sky-beige">
              <iframe
                title={`Google Map — ${site.area}`}
                src={site.mapEmbedSrc}
                className="absolute inset-0 h-full w-full border-0"
                width="600"
                height="450"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <p className="px-2 py-3 text-center text-xs text-sky-muted">
              Exact entry points may update during construction—confirm navigation pins before your visit.
            </p>
          </div>
        </div>
        <EoiCta />
      </div>
    </section>
  );
}

/** One answer open at a time: the details share a name, so the browser closes the others (the original did this in script). */
export function FAQSection() {
  return (
    <section id="faq" className="scroll-mt-24 bg-sky-mist py-16 md:py-20">
      <div className={SHELL}>
        <div className="overflow-hidden border border-black/25 bg-black">
          <div className="grid lg:grid-cols-12">
            <div className="relative min-h-[420px] border-b border-black/40 lg:col-span-7 lg:min-h-[640px] lg:border-r lg:border-b-0 lg:border-black/40">
              <Image
                src={images.faq.src}
                alt={images.faq.alt}
                fill
                sizes="(min-width: 1280px) 700px, (min-width: 1024px) 58vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/5" />
              <div className="absolute inset-x-5 bottom-4 rounded-xl bg-white/95 p-4 shadow-sm sm:inset-x-8 sm:bottom-6 sm:p-5">
                <p className="text-3xl leading-none text-sky-charcoal">Have Another Questions?</p>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-sky-muted">Our team is here to help you with every detail.</p>
                  <a
                    href="#contact"
                    className="inline-flex items-center justify-center rounded-full bg-sky-charcoal px-5 py-2 text-sm text-white transition hover:bg-black/80"
                  >
                    Contact us
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-black px-4 py-8 sm:px-6 lg:col-span-5 lg:px-7 lg:py-10">
              <p className="text-xs tracking-[0.2em] text-white/75 uppercase">FAQ</p>
              <h2 className="mt-3 text-5xl leading-[0.95] text-white sm:text-6xl">Frequently Asked Questions</h2>
              <div className="mt-8 space-y-2">
                {faqItems.map((item, i) => (
                  <details key={item.question} name="verdant-crest-faq" open={i === 0} className="group overflow-hidden rounded-md border border-black/20 bg-white">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-3 py-2.5 text-sm text-sky-charcoal [&::-webkit-details-marker]:hidden">
                      <span>{item.question}</span>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 transition-transform duration-300 group-open:rotate-180"
                      >
                        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </summary>
                    <div className="border-t border-black/10 px-3 py-3 text-sm leading-relaxed text-sky-charcoal/75">{item.answer}</div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
        <EoiCta />
      </div>
    </section>
  );
}

export function ContactSection() {
  return (
    <section id="contact" className="scroll-mt-24 bg-sky-stone/20 py-16 md:py-24">
      <div className={SHELL}>
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <Kicker rule="w-8" className="mb-6">
              Contact
            </Kicker>
            <h2 className="mb-6 text-4xl leading-tight text-balance text-sky-charcoal md:text-5xl">Book a site visit — Verdant Crest</h2>
            <p className="mb-10 max-w-md text-lg leading-relaxed font-light text-sky-muted">
              Share your details for <strong>Verdant Crest</strong> pricing, floor plans, and a curated walkthrough. Home loan assistance and
              brochure delivery available through the desk.
            </p>

            <div className="mb-8 flex flex-wrap gap-3">
              {[
                { t: "RERA disclosure on request", edge: "border-sky-gold/30" },
                { t: site.builder, edge: "border-sky-stone/50" },
                { t: "Home loans — leading banks", edge: "border-sky-stone/50" },
              ].map(({ t, edge }) => (
                <span key={t} className={`rounded-full border bg-white px-4 py-2 text-[10px] font-semibold tracking-wider text-sky-charcoal uppercase ${edge}`}>
                  {t}
                </span>
              ))}
            </div>

            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-sky-stone bg-white shadow-sm">
                  <span aria-hidden="true" className="text-sky-gold">
                    ☎
                  </span>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-medium tracking-widest text-sky-muted uppercase">Phone</p>
                  <a href={telHref} className="text-lg font-medium text-sky-charcoal hover:text-sky-gold">
                    {PHONE_DISPLAY}
                  </a>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-sky-stone bg-white shadow-sm">
                  <span aria-hidden="true" className="text-sky-gold">
                    ✉
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="mb-1 text-[10px] font-medium tracking-widest text-sky-muted uppercase">Email</p>
                  <a href={mailHref} className="text-lg font-medium break-all text-sky-charcoal hover:text-sky-gold">
                    {EMAIL}
                  </a>
                </div>
              </div>
            </div>
            <EoiCta className="mt-8" />
          </div>

          <div className="relative rounded-[2rem] border border-sky-stone/30 bg-white p-6 shadow-2xl sm:p-8 md:p-12">
            <div className="pointer-events-none absolute -top-6 -right-6 h-32 w-32 rounded-full bg-sky-gold/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-6 -left-6 h-40 w-40 rounded-full bg-sky-stone/50 blur-3xl" />
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
